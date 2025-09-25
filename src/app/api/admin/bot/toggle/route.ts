import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { prisma } from '@/lib/prisma';
import { isEmergencyActive } from '@/lib/bot/emergencyStop';
import { z } from 'zod';

const toggleSchema = z.object({
  active: z.boolean()
});

/**
 * POST /api/admin/bot/toggle
 *
 * Toggles the trading bot active state
 * Safety: Prevents activation if emergency stop is active
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const validation = toggleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { active } = validation.data;

    // Check emergency stop status
    if (active && await isEmergencyActive()) {
      return NextResponse.json(
        { error: 'Cannot activate bot while emergency stop is active' },
        { status: 400 }
      );
    }

    // If deactivating and there's an open position, warn but allow
    if (!active) {
      const openPosition = await prisma.botPosition.findFirst({
        where: {
          userId: authResult.id,
          status: 'OPEN'
        }
      });

      if (openPosition) {
        console.warn(`[BOT_TOGGLE] Deactivating bot with open position: ${openPosition.symbol}`);
      }
    }

    // Update or create trading state
    const updatedState = await prisma.tradingState.upsert({
      where: { userId: authResult.id },
      create: {
        userId: authResult.id,
        isActive: active,
        hasOpenPosition: false,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        dailyPnL: 0,
        maxDrawdown: 0
      },
      update: {
        isActive: active
      }
    });

    console.log(`[BOT_TOGGLE] Bot ${active ? 'activated' : 'deactivated'} by admin: ${authResult.email}`);

    return NextResponse.json({
      success: true,
      isActive: updatedState.isActive,
      message: `Bot ${active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('[BOT_TOGGLE_API] Error toggling bot state:', error);
    return NextResponse.json(
      { error: 'Failed to toggle bot state' },
      { status: 500 }
    );
  }
}