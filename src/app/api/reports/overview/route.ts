import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { Decimal } from '@prisma/client/runtime/library';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { determineOptimalInterval } from '@/lib/timeIntervals';
import { aggregateWinRatesByInterval } from '@/lib/reportCalculations';
import { calculateCumulativePnl } from '@/lib/cumulativePnlCalculation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get current user (handles both demo and Auth0)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Parse date range
    const fromDate = searchParams.get('from') 
      ? startOfDay(new Date(searchParams.get('from')!))
      : startOfDay(subDays(new Date(), 30));
    
    const toDate = searchParams.get('to')
      ? endOfDay(new Date(searchParams.get('to')!))
      : endOfDay(new Date());

    // Build filter conditions
    const whereConditions: Record<string, unknown> = {
      userId: userId,
      status: 'CLOSED', // Only closed trades for accurate statistics
      date: {
        gte: fromDate,
        lte: toDate
      }
    };

    // Add optional filters
    if (searchParams.get('symbol')) {
      whereConditions.symbol = searchParams.get('symbol');
    }
    
    if (searchParams.get('side') && searchParams.get('side') !== 'all') {
      whereConditions.side = searchParams.get('side')?.toUpperCase();
    }
    
    if (searchParams.get('tags')) {
      const tags = searchParams.get('tags')!.split(',');
      whereConditions.tags = {
        hasSome: tags
      };
    }

    if (searchParams.get('duration') && searchParams.get('duration') !== 'all') {
      if (searchParams.get('duration') === 'intraday') {
        whereConditions.holdingPeriod = { in: ['SCALP', 'INTRADAY'] };
      } else if (searchParams.get('duration') === 'multiday') {
        whereConditions.holdingPeriod = { in: ['SWING', 'POSITION', 'LONG_TERM'] };
      }
    }

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where: whereConditions,
      select: {
        id: true,
        date: true,
        exitDate: true,
        pnl: true,
        quantity: true
      },
      orderBy: { date: 'asc' }
    });


    // Group trades by date for daily P&L calculation
    const dailyPnlMap = new Map<string, {
      pnl: number;
      trades: number;
      volume: number;
      wins: number;
      losses: number;
    }>();

    trades.forEach(trade => {
      // Use exitDate for grouping when available, fallback to entry date for open trades
      const groupingDate = trade.exitDate || trade.date;
      const dateKey = format(groupingDate, 'yyyy-MM-dd');
      const existing = dailyPnlMap.get(dateKey) || {
        pnl: 0,
        trades: 0,
        volume: 0,
        wins: 0,
        losses: 0
      };

      const pnlValue = trade.pnl instanceof Decimal ? trade.pnl.toNumber() : Number(trade.pnl);
      const quantity = trade.quantity || 0;

      existing.pnl += pnlValue;
      existing.trades += 1;
      existing.volume += quantity;
      
      if (pnlValue > 0) {
        existing.wins += 1;
      } else if (pnlValue < 0) {
        existing.losses += 1;
      }

      dailyPnlMap.set(dateKey, existing);
    });

    // Convert to array and calculate metrics
    const dailyPnl = Array.from(dailyPnlMap.entries()).map(([date, data]) => ({
      date,
      pnl: parseFloat(data.pnl.toFixed(2)),
      trades: data.trades,
      volume: data.volume,
      winRate: data.trades > 0 ? parseFloat(((data.wins / data.trades) * 100).toFixed(2)) : 0,
      wins: data.wins,
      losses: data.losses
    }));

    // Determine optimal interval based on date range
    const optimalInterval = determineOptimalInterval({ start: fromDate, end: toDate });
    
    // Aggregate win rates by interval for proper chart display
    const aggregatedWinRates = aggregateWinRatesByInterval(dailyPnl, optimalInterval.type);

    // Calculate the number of days in the selected period
    const daysDiff = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate total P&L and average daily P&L based on total days in period
    const totalPnl = trades.reduce((sum, trade) => {
      const pnlValue = trade.pnl instanceof Decimal ? trade.pnl.toNumber() : Number(trade.pnl);
      return sum + pnlValue;
    }, 0);
    const averageDailyPnl = totalPnl / daysDiff;

    // Calculate cumulative P&L using shared utility
    const cumulativePnl = calculateCumulativePnl(trades, fromDate);

    // Calculate overall win percentage
    const totalWins = trades.filter(t => {
      const pnlValue = t.pnl instanceof Decimal ? t.pnl.toNumber() : Number(t.pnl);
      return pnlValue > 0;
    }).length;
    const winPercentage = trades.length > 0 ? (totalWins / trades.length) * 100 : 0;

    // Calculate total volume and average daily volume based on total days in period
    const totalVolume = trades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
    const averageDailyVolume = totalVolume / daysDiff;

    // Calculate average daily volume over trading days only (days with actual trades)
    const tradingDaysCount = dailyPnlMap.size; // Number of unique days with trades
    const averageDailyVolumeOnTradingDays = tradingDaysCount > 0 ? totalVolume / tradingDaysCount : 0;

    // Calculate average daily P&L over trading days only (days with actual trades)
    const averageDailyPnlOnTradingDays = tradingDaysCount > 0 ? totalPnl / tradingDaysCount : 0;

    return NextResponse.json({
      dailyPnl,
      aggregatedWinRates,
      averageDailyPnl: parseFloat(averageDailyPnl.toFixed(2)),
      averageDailyPnlOnTradingDays: parseFloat(averageDailyPnlOnTradingDays.toFixed(2)),
      averageDailyVolume: parseFloat(averageDailyVolume.toFixed(2)),
      averageDailyVolumeOnTradingDays: parseFloat(averageDailyVolumeOnTradingDays.toFixed(2)),
      cumulativePnl,
      winPercentage: parseFloat(winPercentage.toFixed(2)),
      totalVolume,
      daysDiff,
      tradingDaysCount
    });

  } catch (error) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}