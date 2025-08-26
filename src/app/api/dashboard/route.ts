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
  const demo = searchParams.get('demo') === 'true';
  
  // Demo mode - return mock data
  if (demo) {
    // For demo mode, we'll return empty/default data
    const emptyDashboardData = {
      dayData: [],
      kpiData: {
        totalPnl: 0,
        totalTrades: 0,
        totalVolume: 0,
        winRate: 0,
        avgWinningTrade: 0,
        avgLosingTrade: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        bestDay: 0,
        worstDay: 0,
        avgPositionMae: 0,
        avgPositionMfe: 0,
        performanceByDayOfWeek: [],
        performanceByMonthOfYear: [],
        avgHoldTimeWinning: 0,
        avgHoldTimeLosing: 0,
        largestGain: 0,
        largestLoss: 0,
        performanceByDuration: [],
        winningTradesCount: 0,
        losingTradesCount: 0
      },
      cumulativePnl: [],
      summary: {
        totalTrades: 0,
        totalPnl: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        bestDay: 0,
        worstDay: 0
      }
    };
    return NextResponse.json(emptyDashboardData);
  }

  // Authenticated mode - get user-specific data
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
      userId: user.id,
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

    // Get user's trades with filters
    const trades = await prisma.trade.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Get day data with filters
    const dayDataWhereClause = {
      userId: user.id,
      ...(whereClause.date && { date: whereClause.date })
    };
    
    const dayData = await prisma.dayData.findMany({
      where: dayDataWhereClause,
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

    // Calculate cumulative P&L for chart
    const cumulativePnl: { date: string; value: number }[] = [];
    let runningPnl = 0;
    const tradesByDate = new Map<string, typeof trades>();
    
    trades.forEach(trade => {
      const dateStr = trade.date.toISOString().split('T')[0];
      if (!tradesByDate.has(dateStr)) {
        tradesByDate.set(dateStr, []);
      }
      tradesByDate.get(dateStr)!.push(trade);
    });

    tradesByDate.forEach((dayTrades, dateStr) => {
      const dayPnl = dayTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'object' ? trade.pnl.toNumber() : Number(trade.pnl)), 0);
      runningPnl += dayPnl;
      cumulativePnl.push({
        date: dateStr,
        value: runningPnl
      });
    });

    // Fetch advanced metrics using aggregation functions
    const [
      performanceByDayOfWeek,
      performanceByMonthOfYear,
      holdTimeStats,
      largestGainLoss,
      performanceByDuration
    ] = await Promise.all([
      calculatePerformanceByDayOfWeek(user.id, filters),
      calculatePerformanceByMonthOfYear(user.id, filters),
      calculateHoldTimeStatistics(user.id, filters),
      calculateLargestGainLoss(user.id, filters),
      calculatePerformanceByDuration(user.id, filters)
    ]);

    const dashboardData = {
      dayData: dayData.map(day => ({
        date: day.date.toISOString().split('T')[0],
        pnl: day.pnl,
        trades: day.trades,
        volume: day.volume,
        winRate: day.winRate,
        commissions: day.commissions
      })),
      kpiData: {
        totalPnl,
        totalTrades,
        totalVolume,
        winRate,
        avgWinningTrade,
        avgLosingTrade,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        bestDay: dayData.length > 0 ? Math.max(...dayData.map(d => d.pnl)) : 0,
        worstDay: dayData.length > 0 ? Math.min(...dayData.map(d => d.pnl)) : 0,
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
        losingTradesCount: losingTrades.length
      },
      cumulativePnl,
      summary: {
        totalTrades,
        totalPnl,
        winRate,
        avgWin: avgWinningTrade,
        avgLoss: avgLosingTrade,
        bestDay: dayData.length > 0 ? Math.max(...dayData.map(d => d.pnl)) : 0,
        worstDay: dayData.length > 0 ? Math.min(...dayData.map(d => d.pnl)) : 0
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    // Return more detailed error in development mode
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error 
      ? error.message 
      : 'Internal server error';
    console.error('Dashboard API full error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    }, { status: 500 });
  }
}