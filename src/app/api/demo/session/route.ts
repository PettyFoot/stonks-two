import { NextRequest, NextResponse } from 'next/server';
import { getDemoSessionFromCookies, extendDemoSession } from '@/lib/demo/demoSession';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEMO SESSION API GET REQUEST ===');
    console.log('Request URL:', request.url);
    console.log('Request headers cookies:', request.headers.get('cookie'));
    
    const demoSession = await getDemoSessionFromCookies();
    
    console.log('Demo session from cookies:', demoSession);
    
    if (!demoSession) {
      console.log('No demo session found, returning isDemo: false');
      return NextResponse.json({ isDemo: false }, { status: 200 });
    }

    const responseData = {
      isDemo: true,
      sessionId: demoSession.sessionId,
      expiresAt: demoSession.expiresAt,
      user: demoSession.demoUser,
      features: demoSession.features,
    };

    console.log('Demo session found, returning:', responseData);
    
    // Return the demo session data
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error getting demo session:', error);
    return NextResponse.json({ isDemo: false }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'extend') {
      const extendedSession = await extendDemoSession();
      
      if (!extendedSession) {
        return NextResponse.json(
          { error: 'No active demo session to extend' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        expiresAt: extendedSession.expiresAt,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error handling demo session action:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}