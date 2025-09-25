import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { prisma } from '@/lib/prisma';
import { isEmergencyActive } from '@/lib/bot/emergencyStop';

/**
 * GET /api/admin/bot/status
 *
 * Returns the current status of the trading bot including:
 * - Trading state (active, has position, etc.)
 * - Current position details
 * - Emergency stop status
 * - Connection health
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Get trading state
    const tradingState = await prisma.tradingState.findUnique({
      where: { userId: authResult.id }
    });

    // Get current position if exists
    let currentPosition = null;
    if (tradingState?.hasOpenPosition) {
      currentPosition = await prisma.botPosition.findFirst({
        where: {
          userId: authResult.id,
          status: 'OPEN'
        }
      });
    }

    // Check emergency stop status
    const emergencyActive = await isEmergencyActive();

    // Check connection health (simplified for now)
    let connectionHealth: 'good' | 'warning' | 'error' = 'good';

    // Check if we have SnapTrade credentials
    if (!process.env.SNAPTRADE_CLIENT_ID || !process.env.SNAPTRADE_CONSUMER_KEY) {
      connectionHealth = 'error';
    }

    // Check recent bot activity for warnings
    if (tradingState?.isActive && tradingState.lastTradeAt) {
      const hoursSinceLastTrade = (Date.now() - new Date(tradingState.lastTradeAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrade > 24) {
        connectionHealth = 'warning';
      }
    }

    const response = {
      tradingState: tradingState ? {
        isActive: tradingState.isActive,
        hasOpenPosition: tradingState.hasOpenPosition,
        currentStrategy: tradingState.currentStrategy,
        totalTrades: tradingState.totalTrades,
        winningTrades: tradingState.winningTrades,
        losingTrades: tradingState.losingTrades,
        totalPnL: parseFloat(tradingState.totalPnL.toString()),
        dailyPnL: parseFloat(tradingState.dailyPnL.toString()),
        lastTradeAt: tradingState.lastTradeAt?.toISOString() || null
      } : null,
      currentPosition: currentPosition ? {
        id: currentPosition.id,
        symbol: currentPosition.symbol,
        side: currentPosition.side,
        quantity: currentPosition.quantity,
        entryPrice: parseFloat(currentPosition.entryPrice.toString()),
        currentPrice: currentPosition.currentPrice ? parseFloat(currentPosition.currentPrice.toString()) : null,
        unrealizedPnL: currentPosition.unrealizedPnL ? parseFloat(currentPosition.unrealizedPnL.toString()) : null,
        stopLoss: currentPosition.stopLoss ? parseFloat(currentPosition.stopLoss.toString()) : null,
        takeProfit: currentPosition.takeProfit ? parseFloat(currentPosition.takeProfit.toString()) : null,
        openedAt: currentPosition.openedAt.toISOString()
      } : null,
      isEmergencyActive: emergencyActive,
      connectionHealth
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[BOT_STATUS_API] Error fetching bot status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot status' },
      { status: 500 }
    );
  }
}