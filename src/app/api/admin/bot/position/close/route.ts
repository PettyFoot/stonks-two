import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { prisma } from '@/lib/prisma';
import { PositionManager } from '@/lib/bot/positionManager';
import { isEmergencyActive } from '@/lib/bot/emergencyStop';
import { z } from 'zod';

const closePositionSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters')
});

/**
 * POST /api/admin/bot/position/close
 *
 * Manually closes the current open position
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const validation = closePositionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    // Check emergency stop status
    if (await isEmergencyActive()) {
      return NextResponse.json(
        { error: 'Cannot manually close position while emergency stop is active' },
        { status: 400 }
      );
    }

    // Get current position
    const currentPosition = await prisma.botPosition.findFirst({
      where: {
        userId: authResult.id,
        status: 'OPEN'
      }
    });

    if (!currentPosition) {
      return NextResponse.json(
        { error: 'No open position to close' },
        { status: 400 }
      );
    }

    // Get user's SnapTrade credentials
    const user = await prisma.user.findUnique({
      where: { id: authResult.id },
      select: {
        snapTradeUserId: true,
        snapTradeUserSecret: true
      }
    });

    if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) {
      return NextResponse.json(
        { error: 'SnapTrade credentials not found' },
        { status: 400 }
      );
    }

    // Create position manager and close position
    const positionManager = new PositionManager(
      authResult.id,
      currentPosition.accountId,
      user.snapTradeUserSecret
    );

    console.log(`[POSITION_CLOSE_API] Manual position close requested by admin: ${authResult.email}`);
    console.log(`[POSITION_CLOSE_API] Position: ${currentPosition.side} ${currentPosition.quantity} ${currentPosition.symbol}`);
    console.log(`[POSITION_CLOSE_API] Reason: ${reason}`);

    const result = await positionManager.closePosition(`Manual close: ${reason}`);

    if (result.success) {
      console.log(`[POSITION_CLOSE_API] ✅ Position closed successfully`);

      return NextResponse.json({
        success: true,
        message: 'Position closed successfully',
        order: result.order
      });
    } else {
      console.error(`[POSITION_CLOSE_API] ❌ Failed to close position: ${result.error}`);

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to close position'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[POSITION_CLOSE_API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to close position due to system error'
      },
      { status: 500 }
    );
  }
}