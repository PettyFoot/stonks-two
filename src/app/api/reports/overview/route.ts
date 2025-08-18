import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { Decimal } from '@prisma/client/runtime/library';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse date range
    const fromDate = searchParams.get('from') 
      ? startOfDay(new Date(searchParams.get('from')!))
      : startOfDay(subDays(new Date(), 30));
    
    const toDate = searchParams.get('to')
      ? endOfDay(new Date(searchParams.get('to')!))
      : endOfDay(new Date());

    // Build filter conditions
    const whereConditions: Record<string, unknown> = {
      userId: user.id,
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
      const dateKey = format(trade.date, 'yyyy-MM-dd');
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
      winRate: data.trades > 0 ? parseFloat(((data.wins / data.trades) * 100).toFixed(2)) : 0
    }));

    // Calculate average daily P&L
    const totalPnl = dailyPnl.reduce((sum, day) => sum + day.pnl, 0);
    const averageDailyPnl = dailyPnl.length > 0 ? totalPnl / dailyPnl.length : 0;

    // Calculate cumulative P&L
    let cumulativeSum = 0;
    const cumulativePnl = dailyPnl.map(day => {
      cumulativeSum += day.pnl;
      return {
        date: day.date,
        value: parseFloat(cumulativeSum.toFixed(2))
      };
    });

    // Calculate overall win percentage
    const totalWins = trades.filter(t => {
      const pnlValue = t.pnl instanceof Decimal ? t.pnl.toNumber() : Number(t.pnl);
      return pnlValue > 0;
    }).length;
    const winPercentage = trades.length > 0 ? (totalWins / trades.length) * 100 : 0;

    // Calculate total volume
    const totalVolume = trades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);

    return NextResponse.json({
      dailyPnl,
      averageDailyPnl: parseFloat(averageDailyPnl.toFixed(2)),
      cumulativePnl,
      winPercentage: parseFloat(winPercentage.toFixed(2)),
      totalVolume
    });

  } catch (error) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}