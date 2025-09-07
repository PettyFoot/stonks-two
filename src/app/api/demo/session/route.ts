import { NextRequest, NextResponse } from 'next/server';
import { getDemoSessionFromCookies, extendDemoSession } from '@/lib/demo/demoSession';

export async function GET(request: NextRequest) {
  try {
    const demoSession = await getDemoSessionFromCookies();
    
    if (!demoSession) {
      const response = NextResponse.json({ isDemo: false }, { status: 200 });
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const responseData = {
      isDemo: true,
      sessionId: demoSession.sessionId,
      expiresAt: demoSession.expiresAt,
      user: demoSession.demoUser,
      features: demoSession.features,
    };

    // Return the demo session data with cache control headers
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error('Error getting demo session:', error);
    const errorResponse = NextResponse.json({ isDemo: false }, { status: 200 });
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    return errorResponse;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'extend') {
      const extendedSession = await extendDemoSession();
      
      if (!extendedSession) {
        const notFoundResponse = NextResponse.json(
          { error: 'No active demo session to extend' },
          { status: 404 }
        );
        notFoundResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        notFoundResponse.headers.set('Pragma', 'no-cache');
        notFoundResponse.headers.set('Expires', '0');
        return notFoundResponse;
      }

      const response = NextResponse.json({
        success: true,
        expiresAt: extendedSession.expiresAt,
      });
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const badRequestResponse = NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    badRequestResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    badRequestResponse.headers.set('Pragma', 'no-cache');
    badRequestResponse.headers.set('Expires', '0');
    return badRequestResponse;
  } catch (error) {
    console.error('Error handling demo session action:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    return errorResponse;
  }
}