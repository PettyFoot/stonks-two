import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getDemoSessionFromCookies } from '@/lib/demo/demoSession';

/**
 * Unified session endpoint that returns the current authentication state
 * This is the single source of truth for auth status
 */
export async function GET(request: NextRequest) {
  try {
    // Check for Auth0 session first (prioritize real users)
    const auth0Session = await getSession();
    
    if (auth0Session?.user?.sub) {
      const response = NextResponse.json({
        type: 'authenticated',
        user: {
          id: auth0Session.user.sub,
          name: auth0Session.user.name || auth0Session.user.nickname || '',
          email: auth0Session.user.email || '',
          picture: auth0Session.user.picture || null
        }
      });
      
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    // Check for demo session if no Auth0 user
    const demoSession = await getDemoSessionFromCookies();
    
    if (demoSession) {
      const response = NextResponse.json({
        type: 'demo',
        sessionId: demoSession.sessionId,
        expiresAt: demoSession.expiresAt,
        user: {
          id: demoSession.demoUser.id,
          name: demoSession.demoUser.name,
          email: demoSession.demoUser.email,
          picture: demoSession.demoUser.picture || null
        }
      });
      
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    // No session found
    const response = NextResponse.json({ type: 'unauthenticated' });
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;

  } catch (error) {
    console.error('Error in unified session check:', error);
    const errorResponse = NextResponse.json({ type: 'unauthenticated' });
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    return errorResponse;
  }
}