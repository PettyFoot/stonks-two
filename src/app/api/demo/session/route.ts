import { NextRequest, NextResponse } from 'next/server';
import { getDemoSessionFromCookies, extendDemoSession } from '@/lib/demo/demoSession';

export async function GET(request: NextRequest) {
  try {
    const demoSession = await getDemoSessionFromCookies();
    
    if (!demoSession) {
      return NextResponse.json({ isDemo: false }, { status: 200 });
    }

    // Return the demo session data
    return NextResponse.json({
      isDemo: true,
      sessionId: demoSession.sessionId,
      expiresAt: demoSession.expiresAt,
      user: demoSession.demoUser,
      features: demoSession.features,
    });
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