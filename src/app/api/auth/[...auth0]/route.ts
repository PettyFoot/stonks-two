import { handleAuth, handleLogin, handleLogout, handleCallback } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';
import { clearDemoSession } from '@/lib/demo/demoSession';

const baseURL = process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      prompt: 'select_account',
      max_age: 0  // Forces re-authentication
    },
    returnTo: '/dashboard'
  }),
  logout: handleLogout({
    returnTo: baseURL
  }),
  signup: handleLogin({
    authorizationParams: {
      screen_hint: 'signup',
      prompt: 'login',
      login_hint: 'signup'
    },
    returnTo: '/onboarding'
  }),
  callback: handleCallback({
    afterCallback: async (req: NextRequest, session: any, state: any) => {
      console.log('Auth0 callback: User authenticated, clearing any demo data');
      
      // Clear demo session directly (more reliable than API calls)
      try {
        await clearDemoSession();
        console.log('Demo session cleared successfully during auth callback');
      } catch (error) {
        console.warn('Error clearing demo session during auth callback:', error);
      }
      
      return session;
    }
  })
});

export const POST = handleAuth();