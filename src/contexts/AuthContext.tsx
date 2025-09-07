'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser as useAuth0User } from '@auth0/nextjs-auth0/client';
import type { UserProfile } from '@auth0/nextjs-auth0/client';
import { MarketDataCache } from '@/lib/marketData/cache';
import { DemoCleanup } from '@/lib/demo/demoCleanup';

interface DemoUser {
  isDemo: true;
  id: string;
  name: string;
  email: string;
  picture?: string;
  sessionId: string;
  expiresAt: string;
}

interface AuthUser extends UserProfile {
  isDemo: false;
}

export type User = DemoUser | AuthUser;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error?: Error;
  isDemo: boolean;
  canUpload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  upgradeUrl: string;
  logout: () => Promise<void>;
  extendSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { 
    user: auth0User, 
    isLoading: auth0Loading, 
    error: auth0Error 
  } = useAuth0User();
  
  const [demoSession, setDemoSession] = useState<DemoUser | null>(null);
  const [isCheckingDemo, setIsCheckingDemo] = useState(true);
  const [sessionError, setSessionError] = useState<Error | undefined>(undefined);
  const [previousAuthState, setPreviousAuthState] = useState<{ wasDemo: boolean; userId: string | null }>({ 
    wasDemo: false, 
    userId: null 
  });

  // Check for demo session on mount and when Auth0 user changes
  useEffect(() => {
    async function checkDemoSession() {
      try {
        setIsCheckingDemo(true);
        const response = await fetch('/api/demo/session');
        
        if (response.ok) {
          const session = await response.json();
          
          if (session.isDemo) {
            setDemoSession({
              isDemo: true,
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              picture: session.user.picture,
              sessionId: session.sessionId,
              expiresAt: session.expiresAt,
            });
          } else {
            setDemoSession(null);
          }
        } else {
          setDemoSession(null);
        }
      } catch (error) {
        console.error('Error checking demo session:', error);
        setSessionError(error as Error);
        setDemoSession(null);
      } finally {
        setIsCheckingDemo(false);
      }
    }

    // Only check for demo session if there's no Auth0 user
    if (!auth0User && !auth0Loading) {
      checkDemoSession();
    } else {
      setIsCheckingDemo(false);
      
      setDemoSession(null);
    }
  }, [auth0User, auth0Loading]);

  // Determine the current user
  const user: User | null = auth0User 
    ? { isDemo: false, ...auth0User }
    : demoSession;

  // Simply check if user is the demo user account
  const isDemo = user?.id === 'demo-user-001';
  
  // Additional validation: ensure we don't have conflicting states
  useEffect(() => {
    if (auth0User && user?.id === 'demo-user-001') {
      console.error('Critical: Detected demo user ID with Auth0 user present - clearing demo session');
      setDemoSession(null);
      // Force a comprehensive cleanup
      DemoCleanup.clearAllDemoData().catch(error => {
        console.warn('Error during emergency demo cleanup:', error);
      });
    }
  }, [auth0User, user?.id]);
  
  // Clear demo data when transitioning from demo to authenticated user
  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentIsDemo = isDemo;
    
    // If we transitioned from demo to authenticated user, clear demo data
    if (previousAuthState.wasDemo && !currentIsDemo && currentUserId && currentUserId !== 'demo-user-001') {
      console.log('Detected transition from demo to authenticated user - clearing all demo data');
      
      // Use comprehensive demo cleanup
      DemoCleanup.clearAllDemoData()
        .then(() => {
          console.log('Demo data cleared successfully after authentication transition');
        })
        .catch(error => {
          console.warn('Error clearing demo data after authentication transition:', error);
        });
    }
    
    // Update previous auth state
    setPreviousAuthState({ 
      wasDemo: currentIsDemo, 
      userId: typeof currentUserId === 'string' ? currentUserId : null 
    });
  }, [user?.id, isDemo, previousAuthState.wasDemo]);
  
  const isLoading = auth0Loading || isCheckingDemo;
  const error = auth0Error || sessionError;

  const logout = async () => {
    if (isDemo) {
      try {
        // Use comprehensive demo cleanup
        await DemoCleanup.clearOnDemoLogout();
        setDemoSession(null);
        window.location.href = '/';
      } catch (error) {
        console.error('Error logging out of demo:', error);
        // Fallback cleanup
        await DemoCleanup.clearAllDemoData();
        window.location.href = '/';
      }
    } else {
      window.location.href = '/api/auth/logout';
    }
  };

  const extendSession = async () => {
    if (!isDemo) return;

    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (demoSession) {
          setDemoSession({
            ...demoSession,
            expiresAt: data.expiresAt,
          });
        }
      }
    } catch (error) {
      console.error('Error extending demo session:', error);
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    error,
    isDemo,
    canUpload: !isDemo,
    canEdit: !isDemo,
    canDelete: !isDemo,
    canExport: !isDemo,
    upgradeUrl: isDemo ? '/api/auth/signup?upgrade=demo' : '/pricing',
    logout,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Backward compatibility hook - this maintains compatibility with existing useUser calls
export function useUser() {
  const { user, isLoading, error } = useAuth();
  return { user, isLoading, error };
}