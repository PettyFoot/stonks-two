import { NextRequest, NextResponse } from 'next/server';
import { getDemoSessionFromCookies } from '@/lib/demo/demoSession';

export async function POST(request: NextRequest) {
  try {
    const demoSession = await getDemoSessionFromCookies();
    
    if (!demoSession) {
      return NextResponse.json(
        { error: 'No active demo session' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { currentPage, filters, trigger } = body;

    // Store upgrade context in session/cookie for post-signup redirect
    const upgradeContext = {
      demoSessionId: demoSession.sessionId,
      currentPage: currentPage || '/dashboard',
      filters: filters || null,
      trigger: trigger || 'general',
      timestamp: new Date().toISOString()
    };

    // You could store this in Redis, database, or session cookie
    // For now, we'll use a simple approach with localStorage on client
    // In production, you'd want to store this server-side with a unique token

    return NextResponse.json({
      success: true,
      upgradeContext,
      message: 'Demo upgrade context prepared'
    });

  } catch (error) {
    console.error('Error preparing demo upgrade:', error);
    return NextResponse.json(
      { error: 'Failed to prepare upgrade context' },
      { status: 500 }
    );
  }
}