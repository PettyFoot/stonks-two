'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Auth state types
type AuthState = 
  | { type: 'loading' }
  | { type: 'demo'; sessionId: string; expiresAt: string; user: UserData }
  | { type: 'authenticated'; user: UserData }
  | { type: 'unauthenticated' };

interface UserData {
  id: string;
  name: string;
  email: string;
  picture?: string | null;
}

interface AuthContextValue {
  authState: AuthState;
  user: UserData | null;
  isLoading: boolean;
  isDemo: boolean;
  canUpload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  upgradeUrl: string;
  logout: () => Promise<void>;
  extendSession: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ type: 'loading' });

  const fetchAuthState = async () => {
    try {
      setAuthState({ type: 'loading' });
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.type === 'authenticated') {
        setAuthState({
          type: 'authenticated',
          user: data.user
        });
      } else if (data.type === 'demo') {
        setAuthState({
          type: 'demo',
          sessionId: data.sessionId,
          expiresAt: data.expiresAt,
          user: data.user
        });
      } else {
        setAuthState({ type: 'unauthenticated' });
      }
    } catch (error) {
      console.error('Error fetching auth state:', error);
      setAuthState({ type: 'unauthenticated' });
    }
  };

  // Fetch auth state on mount
  useEffect(() => {
    fetchAuthState();
  }, []);

  // Derived values for easy consumption
  const user = authState.type === 'demo' || authState.type === 'authenticated' 
    ? authState.user 
    : null;
  const isLoading = authState.type === 'loading';
  const isDemo = authState.type === 'demo';

  // Permissions (demo users have limited permissions)
  const canUpload = authState.type === 'authenticated';
  const canEdit = true; // Both demo and auth users can edit
  const canDelete = authState.type === 'authenticated';
  const canExport = true; // Both demo and auth users can export
  const upgradeUrl = isDemo ? '/api/auth/login' : '/pricing';

  const logout = async () => {
    try {
      if (isDemo) {
        // Clear demo session
        await fetch('/api/demo/logout', { method: 'POST' });
      } else {
        // Auth0 logout
        window.location.href = '/api/auth/logout';
        return;
      }
      
      // Redirect to home after demo logout
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect even on error
      window.location.href = '/';
    }
  };

  const extendSession = async () => {
    if (!isDemo) return;
    
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend' })
      });
      
      if (response.ok) {
        // Refetch auth state to get updated expiration
        await fetchAuthState();
      }
    } catch (error) {
      console.error('Error extending session:', error);
    }
  };

  const contextValue: AuthContextValue = {
    authState,
    user,
    isLoading,
    isDemo,
    canUpload,
    canEdit,
    canDelete,
    canExport,
    upgradeUrl,
    logout,
    extendSession,
    refetch: fetchAuthState
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}