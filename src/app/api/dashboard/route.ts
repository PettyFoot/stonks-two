import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { 
  calculatePerformanceByDayOfWeek,
  calculatePerformanceByMonthOfYear,
  calculateHoldTimeStatistics,
  calculateLargestGainLoss,
  calculatePerformanceByDuration
} from '@/lib/tradeAggregations';
import { cacheService } from '@/lib/services/cacheService';
import { calculateCumulativePnl } from '@/lib/cumulativePnlCalculation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Get filter parameters
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const symbol = searchParams.get('symbol');
  const side = searchParams.get('side') as 'all' | 'long' | 'short' | null;
  const tags = searchParams.get('tags')?.split(',').filter(Boolean);
  const duration = searchParams.get('duration') as 'all' | 'intraday' | 'swing' | null;
  const showOpenTrades = searchParams.get('showOpenTrades') === 'true';
  
  // Get current user (handles both demo and Auth0)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const userId = user.id;

  // Generate cache key based on filters
  const cacheKey = `dashboard:${userId}:${JSON.stringify({
    dateFrom, dateTo, symbol, side, tags, duration, showOpenTrades
  })}`;

  // Try to get cached data first
  const cached = await cacheService.getAnalytics(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const startTime = Date.now();

    // Build filter conditions
    const filters: {
      dateFrom?: Date;
      dateTo?: Date;
      symbol?: string;
      side?: 'LONG' | 'SHORT';
      tags?: string[];
      duration?: 'all' | 'intraday' | 'swing';
      showOpenTrades?: boolean;
    } = {};
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (symbol && symbol !== 'all') filters.symbol = symbol;
    if (side && side !== 'all') filters.side = side.toUpperCase() as 'LONG' | 'SHORT';
    if (tags && tags.length > 0) filters.tags = tags;
    if (duration && duration !== 'all') filters.duration = duration;
    if (showOpenTrades !== undefined) filters.showOpenTrades = showOpenTrades;

    // Build where clause for Prisma queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: Record<string, any> = {
      userId: userId,
    };
    
    if (!showOpenTrades) {
      whereClause.status = 'CLOSED';
    }
    
    if (filters.dateFrom || filters.dateTo) {
      whereClause.date = {};
      if (filters.dateFrom) whereClause.date.gte = filters.dateFrom;
      if (filters.dateTo) whereClause.date.lte = filters.dateTo;
    }
    
    if (filters.symbol) {
      whereClause.symbol = filters.symbol;
    }
    
    if (filters.side) {
      whereClause.side = filters.side;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      whereClause.tags = {
        hasSome: filters.tags
      };
    }
    
    if (filters.duration === 'intraday') {
      whereClause.timeInTrade = { lte: 86400 };
    } else if (filters.duration === 'swing') {
      whereClause.timeInTrade = { gt: 86400 };
    }

    // Optimize database queries with parallel execution and selective fields
    const trades = await prisma.trade.findMany({
      where: whereClause,
      select: {
        id: true,
        date: true,
        exitDate: true,
        pnl: true,
        quantity: true,
        timeInTrade: true,
        symbol: true,
        side: true
      },
      orderBy: { date: 'asc' }
    });

    // Calculate basic KPIs from filtered trades
    const totalPnl = trades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)), 0);
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
    const winningTrades = trades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)) > 0);
    const losingTrades = trades.filter(trade => (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)) < 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWinningTrade = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)), 0) / winningTrades.length 
      : 0;
    const avgLosingTrade = losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)), 0) / losingTrades.length 
      : 0;

    // Calculate consecutive wins/losses
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    
    trades.forEach(trade => {
      const pnl = typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl);
      if (pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else if (pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });

    // Calculate profit factor (total wins / absolute total losses)
    const totalWins = winningTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    
    // Calculate average daily volume
    const uniqueDays = new Set(trades.map(trade => trade.date.toISOString().split('T')[0]));
    const avgDailyVolume = uniqueDays.size > 0 ? totalVolume / uniqueDays.size : 0;

    // Calculate cumulative P&L using shared utility (consistent with reports page)
    const cumulativePnl = calculateCumulativePnl(trades, filters.dateFrom);

    // Execute all advanced metrics calculations in parallel for optimal performance
    const [
      performanceByDayOfWeek,
      performanceByMonthOfYear,
      holdTimeStats,
      largestGainLoss,
      performanceByDuration
    ] = await Promise.all([
      calculatePerformanceByDayOfWeek(userId, filters),
      calculatePerformanceByMonthOfYear(userId, filters),
      calculateHoldTimeStatistics(userId, filters),
      calculateLargestGainLoss(userId, filters),
      calculatePerformanceByDuration(userId, filters)
    ]);

    const dashboardData = {
      dayData: [], // Day data removed - calculated from trades if needed
      kpiData: {
        totalPnl,
        totalTrades,
        totalVolume,
        winRate,
        avgWinningTrade,
        avgLosingTrade,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        bestDay: 0, // Calculated from daily aggregated trades
        worstDay: 0, // Calculated from daily aggregated trades
        avgPositionMae: 0, // TODO: Calculate from detailed trade data if needed
        avgPositionMfe: 0, // TODO: Calculate from detailed trade data if needed
        performanceByDayOfWeek,
        performanceByMonthOfYear,
        avgHoldTimeWinning: holdTimeStats.avgHoldTimeWinning,
        avgHoldTimeLosing: holdTimeStats.avgHoldTimeLosing,
        largestGain: largestGainLoss.largestGain,
        largestLoss: largestGainLoss.largestLoss,
        performanceByDuration,
        winningTradesCount: winningTrades.length,
        losingTradesCount: losingTrades.length,
        profitFactor,
        avgDailyVolume
      },
      cumulativePnl,
      summary: {
        totalTrades,
        totalPnl,
        winRate,
        avgWin: avgWinningTrade,
        avgLoss: avgLosingTrade,
        bestDay: 0, // Calculated from daily aggregated trades
        worstDay: 0 // Calculated from daily aggregated trades
      },
      metadata: {
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        totalTrades,
        cacheHit: false,
        computeTime: Date.now() - startTime,
        lastUpdated: new Date().toISOString()
      }
    };

    // Cache the result for 5 minutes (300 seconds)
    await cacheService.setAnalytics(cacheKey, dashboardData, 300);
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    // Log performance metrics for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Dashboard API performance: Failed for user ${userId}`);
    }
    
    // Return more detailed error in development mode
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error 
      ? error.message 
      : 'Internal server error';
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    }, { status: 500 });
  }
}