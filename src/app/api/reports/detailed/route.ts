import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { 
  calculateConsecutiveStreaks, 
  calculatePnlStandardDeviation, 
  calculateProfitFactor,
  formatDuration 
} from '@/lib/reportCalculations';

export async function GET(request: NextRequest) {
  try {
    // TEMPORARY WORKAROUND: Next.js 15 + Auth0 compatibility issue
    // TODO: Remove this workaround when Auth0 releases Next.js 15 compatible version
    const { prisma } = await import('@/lib/prisma');
    
    // Skip auth check for now and use actual logged in user
    let user = await prisma.user.findFirst({
      where: { email: 'dannyvera127@gmail.com' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0Id: 'danny-auth0-id',
          email: 'dannyvera127@gmail.com',
          name: 'Danny Vera'
        }
      });
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const duration = searchParams.get('duration');

    // Build where clause for Prisma query
    const where: Prisma.TradeWhereInput = {
      userId: user.id,
      status: 'CLOSED', // Only closed trades have realized P&L
    };

    // Add date range filter
    if (dateFrom || dateTo) {
      where.entryDate = {};
      if (dateFrom) {
        where.entryDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.entryDate.lte = endDate;
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

    // Add duration filter
    if (duration && duration !== 'all') {
      if (duration === 'intraday') {
        where.timeInTrade = {
          lt: 86400 // Less than 24 hours in seconds
        };
      } else if (duration === 'multiday') {
        where.timeInTrade = {
          gte: 86400 // 24 hours or more
        };
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
    const allHoldTimes = trades.map(t => t.timeInTrade || 0).filter(t => t > 0);
    const winHoldTimes = winningTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);
    const loseHoldTimes = losingTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);
    const scratchHoldTimes = scratchTrades.map(t => t.timeInTrade || 0).filter(t => t > 0);

    const avgHoldTime = allHoldTimes.length > 0 
      ? allHoldTimes.reduce((a, b) => a + b, 0) / allHoldTimes.length 
      : 0;
    const avgHoldTimeWin = winHoldTimes.length > 0 
      ? winHoldTimes.reduce((a, b) => a + b, 0) / winHoldTimes.length 
      : 0;
    const avgHoldTimeLose = loseHoldTimes.length > 0 
      ? loseHoldTimes.reduce((a, b) => a + b, 0) / loseHoldTimes.length 
      : 0;
    const avgHoldTimeScratch = scratchHoldTimes.length > 0 
      ? scratchHoldTimes.reduce((a, b) => a + b, 0) / scratchHoldTimes.length 
      : 0;

    // Calculate daily averages
    const uniqueDates = [...new Set(trades.map(t => 
      new Date(t.entryDate).toISOString().split('T')[0]
    ))];
    const avgDailyGainLoss = uniqueDates.length > 0 ? totalPnl / uniqueDates.length : 0;
    const avgDailyVolume = uniqueDates.length > 0 ? totalVolume / uniqueDates.length : 0;

    // Calculate advanced metrics
    const streaks = calculateConsecutiveStreaks(trades);
    const stdDev = calculatePnlStandardDeviation(trades);
    const profitFactor = calculateProfitFactor(trades);

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