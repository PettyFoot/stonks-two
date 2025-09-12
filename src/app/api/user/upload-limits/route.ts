import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { checkUploadLimit } from '@/lib/uploadRateLimiter';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check upload limits for the user
    const limitStatus = await checkUploadLimit(user.id);

    return NextResponse.json({
      allowed: limitStatus.allowed,
      remaining: limitStatus.remaining,
      limit: limitStatus.limit,
      resetAt: limitStatus.resetAt.toISOString(),
      isUnlimited: limitStatus.isUnlimited,
      used: limitStatus.limit === -1 ? 0 : Math.max(0, limitStatus.limit - limitStatus.remaining),
    });

  } catch (error) {
    console.error('Upload limits check error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to check upload limits'
    }, { status: 500 });
  }
}