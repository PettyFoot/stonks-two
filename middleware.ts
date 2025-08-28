import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/(with-sidebar)/:path*',
    '/onboarding/:path*',
    '/api/trades/:path*',
    '/api/records/:path*',
    '/api/import/:path*'
  ]
}