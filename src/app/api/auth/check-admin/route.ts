import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth0';

/**
 * Simple endpoint to check if the current user is an admin
 * Safe to call from client components
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    return NextResponse.json({
      isAdmin: user.isAdmin || false,
      userId: user.id
    });
  } catch (error) {
    // If auth fails, user is definitely not admin
    return NextResponse.json({
      isAdmin: false,
      error: error instanceof Error ? error.message : 'Authentication required'
    }, { status: 401 });
  }
}