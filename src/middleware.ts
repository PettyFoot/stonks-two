import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user is trying to access onboarding
  if (pathname === '/onboarding') {
    try {
      const session = await getSession(request);
      
      // If no session, redirect to signup
      if (!session) {
        const signupUrl = new URL('/api/auth/signup', request.url);
        return NextResponse.redirect(signupUrl);
      }
      
      // Check if this is a new user (you can add additional checks here)
      // For now, allow access if authenticated
      return NextResponse.next();
    } catch {
      // If error getting session, redirect to signup
      const signupUrl = new URL('/api/auth/signup', request.url);
      return NextResponse.redirect(signupUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/onboarding']
};