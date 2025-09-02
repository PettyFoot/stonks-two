import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { 
  calculateConsecutiveStreaks, 
  calculatePnlStandardDeviation, 
  calculateProfitFactor,
  formatDuration 
} from '@/lib/reportCalculations';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const demo = searchParams.get('demo') === 'true';
    
    let userId: string;
    
    if (demo) {
      userId = getDemoUserId();
    } else {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      userId = user.id;
    }
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const duration = searchParams.get('duration');

    // Build where clause for Prisma query (only include closed trades for accurate statistics)
    const where: Prisma.TradeWhereInput = {
      userId: userId,
      status: 'CLOSED', // Only closed trades have realized P&L
    };

    // Add date range filter (use date field to match Overview API)
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Add symbol filter
    if (symbol && symbol !== 'all') {
      where.symbol = symbol;
    }

    // Add side filter
    if (side && side !== 'all') {
      where.side = side.toUpperCase() as 'LONG' | 'SHORT';
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      };
    }

    // Add duration filter (use holdingPeriod to match Overview API)
    if (duration && duration !== 'all') {
      if (duration === 'intraday') {
        where.holdingPeriod = { in: ['SCALP', 'INTRADAY'] };
      } else if (duration === 'multiday') {
        where.holdingPeriod = { in: ['SWING', 'POSITION', 'LONG_TERM'] };
      }
    }

    // Fetch trades from database
    const trades = await prisma.trade.findMany({
      where,
      select: {
        id: true,
        symbol: true,
        side: true,
        entryDate: true,
        exitDate: true,
        timeInTrade: true,
        holdingPeriod: true,
        pnl: true,
        quantity: true,
        avgEntryPrice: true,
        entryPrice: true,
        avgExitPrice: true,
        exitPrice: true,
        commission: true,
        fees: true,
        tags: true,
        date: true,
      },
      orderBy: {
        entryDate: 'desc'
      }
    });

    // Calculate statistics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => Number(t.pnl) > 0);
    const losingTrades = trades.filter(t => Number(t.pnl) < 0);
    const scratchTrades = trades.filter(t => Number(t.pnl) === 0);

    // Calculate P&L metrics
    const totalPnl = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const totalCommissions = trades.reduce((sum, t) => sum + Number(t.commission || 0) + Number(t.fees || 0), 0);
    
    // Calculate largest win/loss
    const pnlValues = trades.map(t => Number(t.pnl));
    const largestGain = Math.max(...pnlValues.filter(p => p > 0), 0);
    const largestLoss = Math.min(...pnlValues.filter(p => p < 0), 0);

    // Calculate averages
    const avgTradeGainLoss = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgWinningTrade = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / winningTrades.length 
      : 0;
    const avgLosingTrade = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / losingTrades.length 
      : 0;

    // Calculate volume metrics
    const totalVolume = trades.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const avgPerShareGainLoss = totalVolume > 0 ? totalPnl / totalVolume : 0;

    // Calculate holding time averages
    const winHoldTimes = winningTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);
    const loseHoldTimes = losingTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);
    const scratchHoldTimes = scratchTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);

    const avgHoldTimeWin = winHoldTimes.length > 0 
      ? winHoldTimes.reduce((a, b) => a + b, 0) / winHoldTimes.length 
      : 0;
    const avgHoldTimeLose = loseHoldTimes.length > 0 
      ? loseHoldTimes.reduce((a, b) => a + b, 0) / loseHoldTimes.length 
      : 0;
    const avgHoldTimeScratch = scratchHoldTimes.length > 0 
      ? scratchHoldTimes.reduce((a, b) => a + b, 0) / scratchHoldTimes.length 
      : 0;

    // Calculate daily averages using date field (consistent with Overview API)
    const uniqueDates = [...new Set(trades.map(t => 
      new Date(t.date).toISOString().split('T')[0]
    ))];
    const avgDailyGainLoss = uniqueDates.length > 0 ? totalPnl / uniqueDates.length : 0;
    const avgDailyVolume = uniqueDates.length > 0 ? totalVolume / uniqueDates.length : 0;

    // Transform trades to match TradeData interface
    const transformedTrades = trades.map(trade => ({
      ...trade,
      pnl: trade.pnl?.toNumber() || 0,
      avgEntryPrice: trade.avgEntryPrice?.toNumber() || null,
      avgExitPrice: trade.avgExitPrice?.toNumber() || null,
      entryPrice: trade.entryPrice?.toNumber() || null,
      exitPrice: trade.exitPrice?.toNumber() || null,
      quantity: trade.quantity || 0,
      commissions: trade.commission?.toNumber() || null,
      fees: trade.fees?.toNumber() || null
    }));

    // Calculate advanced metrics
    const streaks = calculateConsecutiveStreaks(transformedTrades);
    const stdDev = calculatePnlStandardDeviation(transformedTrades);
    const profitFactor = calculateProfitFactor(transformedTrades);

    // Prepare statistics response
    const stats = {
      totalGainLoss: totalPnl,
      largestGain,
      largestLoss,
      avgDailyGainLoss,
      avgDailyVolume,
      avgPerShareGainLoss,
      avgTradeGainLoss,
      avgWinningTrade,
      avgLosingTrade,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      scratchTrades: scratchTrades.length,
      avgHoldTimeScratch: formatDuration(avgHoldTimeScratch),
      avgHoldTimeWinning: formatDuration(avgHoldTimeWin),
      avgHoldTimeLosing: formatDuration(avgHoldTimeLose),
      maxConsecutiveWins: streaks.maxConsecutiveWins,
      maxConsecutiveLosses: streaks.maxConsecutiveLosses,
      tradePnlStdDev: stdDev,
      profitFactor,
      totalCommissions,
      totalFees: 0, // Already included in totalCommissions
      totalVolume,
    };

    // Convert trades for client-side processing
    // The aggregation functions in reportCalculations.ts expect certain fields
    const formattedTrades = trades.map(trade => ({
      ...trade,
      pnl: Number(trade.pnl),
      quantity: trade.quantity || 0,
      avgEntryPrice: trade.avgEntryPrice ? Number(trade.avgEntryPrice) : undefined,
      entryPrice: trade.entryPrice ? Number(trade.entryPrice) : undefined,
      timeInTrade: trade.timeInTrade || 0,
      entryDate: trade.entryDate.toISOString(),
      exitDate: trade.exitDate?.toISOString(),
      date: trade.date.toISOString(),
    }));

    return NextResponse.json({
      stats,
      trades: formattedTrades,
    });

  } catch (error) {
    console.error('Error fetching detailed reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailed reports data' },
      { status: 500 }
    );
  }
}