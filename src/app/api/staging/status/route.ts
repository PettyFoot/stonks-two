import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { OrderStagingService } from '@/lib/services/OrderStagingService';

/**
 * GET /api/staging/status
 * Get staging status for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const stagingService = new OrderStagingService();
    const status = await stagingService.getStagingStatus(user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      status
    });

  } catch (error) {
    console.error('[API] Staging status error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get staging status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}