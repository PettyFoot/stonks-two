import { NextResponse } from 'next/server';
import { mockDayData, mockKPIData, mockCumulativePnl } from '@/data/mockData';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30';
  const demo = searchParams.get('demo') === 'true';
  
  // Demo mode - return mock data
  if (demo) {
    const dashboardData = {
      dayData: mockDayData,
      kpiData: mockKPIData,
      cumulativePnl: mockCumulativePnl,
      summary: {
        totalTrades: mockKPIData.totalTrades,
        totalPnl: mockKPIData.totalPnl,
        winRate: mockKPIData.winRate,
        avgWin: mockKPIData.avgWinningTrade,
        avgLoss: mockKPIData.avgLosingTrade,
        bestDay: mockKPIData.bestDay,
        worstDay: mockKPIData.worstDay
      }
    };
    return NextResponse.json(dashboardData);
  }

  // Authenticated mode - get user-specific data
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(range));

    // Get user's trades
    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get day data
    const dayData = await prisma.dayData.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculate KPIs
    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + trade.volume, 0);
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl < 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWinningTrade = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length 
      : 0;
    const avgLosingTrade = losingTrades.length > 0 
      ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length 
      : 0;

    // Calculate cumulative P&L for chart
    const cumulativePnl = [];
    let runningPnl = 0;
    const tradesByDate = new Map();
    
    trades.forEach(trade => {
      const dateStr = trade.date.toISOString().split('T')[0];
      if (!tradesByDate.has(dateStr)) {
        tradesByDate.set(dateStr, []);
      }
      tradesByDate.get(dateStr).push(trade);
    });

    tradesByDate.forEach((dayTrades, dateStr) => {
      const dayPnl = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      runningPnl += dayPnl;
      cumulativePnl.push({
        date: dateStr,
        value: runningPnl
      });
    });

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
        maxConsecutiveWins: 0, // TODO: Calculate
        maxConsecutiveLosses: 0, // TODO: Calculate  
        bestDay: dayData.length > 0 ? Math.max(...dayData.map(d => d.pnl)) : 0,
        worstDay: dayData.length > 0 ? Math.min(...dayData.map(d => d.pnl)) : 0,
        avgPositionMae: 0, // TODO: Calculate from detailed trade data
        avgPositionMfe: 0  // TODO: Calculate from detailed trade data
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}