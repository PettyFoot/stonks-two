import { NextRequest, NextResponse } from 'next/server';
import { createDemoSession, saveDemoSession } from '@/lib/demo/demoSession';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting demo session creation...');
    
    // Create a new demo session
    const demoSession = await createDemoSession();
    console.log('Demo session created:', demoSession.sessionId);
    
    // Save the session to cookies
    await saveDemoSession(demoSession);
    console.log('Demo session saved to cookies');
    
    // Return success response with redirect URL
    return NextResponse.json({
      success: true,
      redirect: '/dashboard',
      session: {
        sessionId: demoSession.sessionId,
        expiresAt: demoSession.expiresAt,
        user: demoSession.demoUser,
      },
    });
  } catch (error) {
    console.error('Error creating demo session:', error);
    return NextResponse.json(
      { error: 'Failed to create demo session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}