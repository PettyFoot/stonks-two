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
    
    // Return success response with redirect URL and flag to set localStorage
    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard',
      setDemoMode: true, // Flag to set localStorage on frontend
      session: {
        sessionId: demoSession.sessionId,
        expiresAt: demoSession.expiresAt,
        user: demoSession.demoUser,
      },
    });

    // Add cache control headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error creating demo session:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to create demo session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    
    // Add cache control headers even for error responses
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    
    return errorResponse;
  }
}