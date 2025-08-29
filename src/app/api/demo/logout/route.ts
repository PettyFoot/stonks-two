import { NextRequest, NextResponse } from 'next/server';
import { clearDemoSession } from '@/lib/demo/demoSession';

export async function POST(request: NextRequest) {
  try {
    // Clear the demo session
    await clearDemoSession();
    
    return NextResponse.json({
      success: true,
      message: 'Demo session cleared',
      clearDemoMode: true, // Flag to clear localStorage on frontend
    });
  } catch (error) {
    console.error('Error clearing demo session:', error);
    return NextResponse.json(
      { error: 'Failed to clear demo session' },
      { status: 500 }
    );
  }
}