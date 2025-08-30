'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useUser as useAuth0User } from '@auth0/nextjs-auth0/client';
import type { UserProfile } from '@auth0/nextjs-auth0/client';

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
  
  // Ref to track if demo mode has been detected to prevent flip-flopping
  const demoModeDetectedRef = useRef<boolean>(false);
  const stableDemoStateRef = useRef<boolean>(false);
  
  // Initialize demo state from localStorage immediately
  React.useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const isDemoFromStorage = localStorage.getItem('demo-mode') === 'true';
      if (isDemoFromStorage) {
        demoModeDetectedRef.current = true;
        stableDemoStateRef.current = true;
        console.log('🔒 Demo mode pre-locked from localStorage on initialization');
      }
    }
  }, []);

  // Check for demo session on mount and when Auth0 user changes
  useEffect(() => {
    async function checkDemoSession() {
      try {
        console.log('=== AUTH CONTEXT: Checking demo session ===');
        setIsCheckingDemo(true);
        const response = await fetch('/api/demo/session');
        
        console.log('Demo session API response status:', response.status);
        
        if (response.ok) {
          const session = await response.json();
          console.log('Demo session API response data:', session);
          
          if (session.isDemo) {
            console.log('✅ Demo session detected, setting demo user');
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
            console.log('❌ No demo session found in response');
            setDemoSession(null);
          }
        } else {
          console.log('❌ Demo session API request failed');
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
      console.log('No Auth0 user, checking for demo session');
      checkDemoSession();
    } else {
      console.log('Auth0 user present or loading, skipping demo check');
      setIsCheckingDemo(false);
      
      // Only clear demo session if demo mode hasn't been locked in
      if (!demoModeDetectedRef.current) {
        console.log('Clearing demo session (demo mode not locked)');
        setDemoSession(null);
      } else {
        console.log('NOT clearing demo session (demo mode is locked)');
      }
    }
  }, [auth0User, auth0Loading]);

  // Determine the current user
  const user: User | null = auth0User 
    ? { isDemo: false, ...auth0User }
    : demoSession;

  // STABLE DEMO MODE DETECTION: Check multiple sources for demo mode
  const isDemoFromSession = user?.isDemo === true;
  const isDemoFromUrl = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/demo') || 
    window.location.search.includes('demo=true') ||
    window.location.hostname.includes('demo')
  );
  
  // Auto-set localStorage flag if we detect demo mode from URL
  if (typeof window !== 'undefined' && isDemoFromUrl && !localStorage.getItem('demo-mode')) {
    localStorage.setItem('demo-mode', 'true');
    console.log('Auto-set demo mode in localStorage due to URL detection');
  }
  const isDemoFromStorage = typeof window !== 'undefined' && 
    localStorage.getItem('demo-mode') === 'true';
  
  // Calculate if demo mode is detected from any source
  const isDemoDetectedNow = isDemoFromSession || isDemoFromUrl || isDemoFromStorage;
  
  // Once demo mode is detected, lock it in to prevent flip-flopping
  if (isDemoDetectedNow && !demoModeDetectedRef.current) {
    demoModeDetectedRef.current = true;
    stableDemoStateRef.current = true;
    console.log('🔒 Demo mode locked in as TRUE - will not flip back to false');
  }
  
  // Use stable demo state that doesn't flip-flop
  const isDemo = stableDemoStateRef.current;
  
  console.log('=== DEMO MODE DETECTION ===');
  console.log('From session:', isDemoFromSession);
  console.log('From URL:', isDemoFromUrl);
  console.log('From storage:', isDemoFromStorage);
  console.log('Detected now:', isDemoDetectedNow);
  console.log('Demo mode locked:', demoModeDetectedRef.current);
  console.log('Stable demo state:', stableDemoStateRef.current);
  console.log('Final isDemo:', isDemo);
  
  const isLoading = auth0Loading || isCheckingDemo;
  const error = auth0Error || sessionError;

  console.log('=== AUTH CONTEXT STATE ===');
  console.log('auth0User:', !!auth0User);
  console.log('auth0Loading:', auth0Loading);
  console.log('demoSession:', !!demoSession);
  console.log('isCheckingDemo:', isCheckingDemo);
  console.log('Final user:', user);
  console.log('Final isDemo:', isDemo);
  console.log('Final isLoading:', isLoading);

  const logout = async () => {
    if (isDemo) {
      try {
        const response = await fetch('/api/demo/logout', { method: 'POST' });
        const data = await response.json();
        
        // Clear localStorage if API indicates to do so
        if (data.clearDemoMode && typeof window !== 'undefined') {
          localStorage.removeItem('demo-mode');
          console.log('Cleared demo mode from localStorage');
        }
        
        // Reset demo mode detection refs on explicit logout
        demoModeDetectedRef.current = false;
        stableDemoStateRef.current = false;
        console.log('🔓 Demo mode unlocked due to explicit logout');
        
        setDemoSession(null);
        window.location.href = '/';
      } catch (error) {
        console.error('Error logging out of demo:', error);
        // Clear localStorage and reset refs on error as well
        if (typeof window !== 'undefined') {
          localStorage.removeItem('demo-mode');
        }
        demoModeDetectedRef.current = false;
        stableDemoStateRef.current = false;
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