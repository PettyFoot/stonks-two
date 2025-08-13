import { handleAuth, handleLogin, handleLogout } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      prompt: 'select_account',
      max_age: 0  // Forces re-authentication
    },
    returnTo: '/dashboard'
  }),
  logout: handleLogout({
    returnTo: '/',
    logoutParams: {
      federated: true  // This clears the Auth0 session AND the identity provider session
    }
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