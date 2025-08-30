import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { getIronSession } from 'iron-session';
import type { DemoSession } from './src/lib/demo/demoSession';

// Define session options (must match demoSession.ts)
const sessionOptions = {
  password: process.env.DEMO_SESSION_SECRET || 'complex_password_at_least_32_characters_long_demo_key',
  cookieName: 'demo-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 30, // 30 minutes
    path: '/', // Ensure cookie is available site-wide
  },
};

async function checkDemoSession(request: NextRequest): Promise<DemoSession | null> {
  try {
    // For middleware, we'll check the cookie directly
    const sessionCookie = request.cookies.get('demo-session')?.value;
    if (!sessionCookie) {
      return null;
    }

    // Simple check - in a real app you'd decrypt the session cookie
    // For now, we'll assume a session exists if the cookie exists
    // The actual session validation happens in the API routes
    return {
      isDemo: true,
      sessionId: 'middleware-check',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      demoUser: {
        id: 'demo-user-001',
        name: 'Demo Trader',
        email: 'demo@tradevoyager.com'
      },
      features: {
        canUpload: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
      }
    };
  } catch (error) {
    console.error('Error checking demo session in middleware:', error);
    return null;
  }
}

function isPublicRoute(pathname: string): boolean {
  const publicPaths = [
    '/',
    '/login', 
    '/signup',
    '/api/auth',
    '/api/demo',
    '/_next',
    '/favicon.ico',
    '/static',
    '/images'
  ];
  
  return publicPaths.some(path => pathname.startsWith(path));
}

function isDemoAllowedRoute(pathname: string): boolean {
  const demoAllowedPaths = [
    '/dashboard',
    '/(with-sidebar)',
    '/search',
    '/api/trades',
    '/api/records',
    '/api/reports',
    '/api/dashboard',
    '/api/calendar',
    '/api/market-data'
  ];
  
  return demoAllowedPaths.some(path => pathname.startsWith(path));
}

function isWriteOperation(pathname: string): boolean {
  const writeOperations = [
    '/api/import',
    '/api/trades/upload',
    '/api/csv/upload'
  ];
  
  return writeOperations.some(path => pathname.startsWith(path));
}

export default async function middleware(request: NextRequest, event?: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Check for demo session first
  const demoSession = await checkDemoSession(request);
  
  if (demoSession) {
    console.log(`Demo session detected for ${pathname}`);
    
    // Block write operations for demo users
    if (isWriteOperation(pathname)) {
      return NextResponse.json({ 
        error: 'Feature not available in demo mode. Please sign up for full access.' 
      }, { status: 403 });
    }
    
    // Allow demo users to access read-only routes
    if (isDemoAllowedRoute(pathname)) {
      return NextResponse.next();
    } else {
      // Demo users trying to access non-demo routes should be redirected
      console.log(`Demo user blocked from ${pathname}, redirecting to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Apply Auth0 protection for non-demo routes
  try {
    return await withMiddlewareAuthRequired()(request, event);
  } catch (error) {
    // If Auth0 middleware fails, redirect to login
    console.log(`Auth0 middleware failed for ${pathname}, redirecting to login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/(with-sidebar)/:path*',
    '/onboarding/:path*',
    '/api/trades/:path*',
    '/api/records/:path*',
    '/api/import/:path*',
    '/api/reports/:path*',
    '/api/dashboard/:path*',
    '/api/calendar/:path*'
  ]
}