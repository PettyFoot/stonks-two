import { handleAuth, handleLogin, handleLogout } from '@auth0/nextjs-auth0';

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
    // Removed federated: true to only clear Auth0 session, not Google session
  }),
  signup: handleLogin({
    authorizationParams: {
      screen_hint: 'signup',
      prompt: 'login',
      login_hint: 'signup'
    },
    returnTo: '/onboarding'
  })
});

export const POST = handleAuth();