import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradingAnalyzer } from '@/lib/analytics';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const symbol = searchParams.get('symbol');

    // Build filter conditions
    const where: Prisma.TradeWhereInput = {
      userId: user.id
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (symbol) {
      where.symbol = symbol.toUpperCase();
    }

    // Fetch trades and day data
    const [trades, dayData] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { date: 'asc' }
      }),
      prisma.dayData.findMany({
        where: {
          userId: user.id,
          ...(startDate || endDate ? {
            date: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {})
            }
          } : {})
        },
        orderBy: { date: 'asc' }
      })
    ]);

    // Create analyzer and calculate metrics
    const analyzer = new TradingAnalyzer(trades, dayData);
    const metrics = analyzer.calculateMetrics();
    const performanceData = analyzer.calculatePerformanceData();
    const monthlyMetrics = analyzer.calculateMonthlyMetrics();
    const symbolPerformance = analyzer.calculateSymbolPerformance();

    // Calculate additional insights
    const recentTrades = trades.slice(-10); // Last 10 trades
    const top5Winners = trades
      .filter(trade => trade.pnl > 0)
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
    const top5Losers = trades
      .filter(trade => trade.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);

    return NextResponse.json({
      metrics,
      performanceData,
      monthlyMetrics,
      symbolPerformance,
      insights: {
        recentTrades: recentTrades.map(trade => ({
          id: trade.id,
          date: trade.date,
          symbol: trade.symbol,
          side: trade.side,
          volume: trade.volume,
          pnl: trade.pnl
        })),
        topWinners: top5Winners.map(trade => ({
          id: trade.id,
          date: trade.date,
          symbol: trade.symbol,
          side: trade.side,
          volume: trade.volume,
          pnl: trade.pnl
        })),
        topLosers: top5Losers.map(trade => ({
          id: trade.id,
          date: trade.date,
          symbol: trade.symbol,
          side: trade.side,
          volume: trade.volume,
          pnl: trade.pnl
        }))
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch analytics'
    }, { status: 500 });
  }
}