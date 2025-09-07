import { NextRequest, NextResponse } from 'next/server';
import { clearDemoSession } from '@/lib/demo/demoSession';

export async function POST(request: NextRequest) {
  try {
    // Clear the demo session
    await clearDemoSession();
    
    const response = NextResponse.json({
      success: true,
      message: 'Demo session cleared',
      clearDemoMode: true, // Flag to clear localStorage on frontend
    });

    // Add cache control headers to prevent caching of demo data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Clear-Site-Data', '"cache", "storage"');
    
    return response;
  } catch (error) {
    console.error('Error clearing demo session:', error);
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to clear demo session' },
      { status: 500 }
    );
    
    // Add cache control headers even for error responses
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    
    return errorResponse;
  }
}