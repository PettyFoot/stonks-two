import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
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

    // Get all trades for the period
    const trades = await prisma.trade.findMany({
      where: whereConditions,
      orderBy: [
        { date: 'desc' }
      ],
      select: {
        id: true,
        date: true,
        openTime: true,
        symbol: true,
        side: true,
        quantity: true,
        executions: true,
        pnl: true,
        entryPrice: true,
        exitPrice: true,
        holdingPeriod: true,
        status: true,
        notes: true,
        tags: true,
        commission: true,
        fees: true,
        marketSession: true,
        orderType: true
      }
    });

    // Transform trades to match frontend interface
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      date: trade.date.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: trade.openTime ? trade.openTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '00:00',
      symbol: trade.symbol,
      side: trade.side.toLowerCase() as 'long' | 'short',
      quantity: trade.quantity,
      executions: trade.executions,
      pnl: typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl,
      entryPrice: trade.entryPrice ? (typeof trade.entryPrice === 'object' ? trade.entryPrice.toNumber() : trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? (typeof trade.exitPrice === 'object' ? trade.exitPrice.toNumber() : trade.exitPrice) : undefined,
      holdingPeriod: trade.holdingPeriod || undefined,
      status: trade.status || undefined,
      notes: trade.notes,
      tags: trade.tags,
      commission: trade.commission ? (typeof trade.commission === 'object' ? trade.commission.toNumber() : trade.commission) : undefined,
      fees: trade.fees ? (typeof trade.fees === 'object' ? trade.fees.toNumber() : trade.fees) : undefined,
      marketSession: trade.marketSession || undefined,
      orderType: trade.orderType || undefined
    }));

    // Calculate win/loss statistics
    const winningTrades = transformedTrades.filter(trade => trade.pnl > 0);
    const losingTrades = transformedTrades.filter(trade => trade.pnl < 0);
    const scratchTrades = transformedTrades.filter(trade => trade.pnl === 0);

    const totalTrades = transformedTrades.length;
    const winCount = winningTrades.length;
    const lossCount = losingTrades.length;
    const scratchCount = scratchTrades.length;

    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    
    const avgWin = winCount > 0 ? totalWins / winCount : 0;
    const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const expectationPerTrade = totalTrades > 0 ? (totalWins - totalLosses) / totalTrades : 0;

    // Kelly percentage calculation
    const kellyPercentage = winRate > 0 && avgLoss > 0 ? 
      ((winRate / 100) * (avgWin / avgLoss) - (1 - winRate / 100)) * 100 : 0;

    // Generate cumulative P&L data
    const cumulativePnl = transformedTrades
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reduce((acc, trade, index) => {
        const cumValue = index === 0 ? trade.pnl : acc[index - 1].value + trade.pnl;
        acc.push({
          date: trade.date,
          value: cumValue,
          trades: index + 1
        });
        return acc;
      }, [] as Array<{ date: string; value: number; trades: number }>);

    // Generate drawdown data
    let peak = 0;
    const cumulativeDrawdown = cumulativePnl.map(point => {
      if (point.value > peak) peak = point.value;
      const drawdown = peak - point.value;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      return {
        date: point.date,
        drawdown,
        drawdownPercent,
        underwater: drawdown
      };
    });

    return NextResponse.json({
      winLossRatio: {
        wins: winCount,
        losses: lossCount,
        scratches: scratchCount,
        winRate,
        lossRate: totalTrades > 0 ? (lossCount / totalTrades) * 100 : 0,
        scratchRate: totalTrades > 0 ? (scratchCount / totalTrades) * 100 : 0,
        totalTrades
      },
      winLossPnlComparison: {
        avgWin,
        avgLoss,
        totalWins,
        totalLosses,
        largestWin,
        largestLoss,
        winCount,
        lossCount
      },
      tradeExpectation: {
        expectation: totalWins - totalLosses,
        expectationPerTrade,
        profitFactor,
        payoffRatio,
        winRate,
        avgWin,
        avgLoss,
        kellyPercentage
      },
      cumulativePnl,
      cumulativeDrawdown,
      trades: transformedTrades, // Include trades data for table display
      metadata: {
        totalTrades,
        tradingDays: new Set(transformedTrades.map(t => t.date)).size,
        dataQuality: totalTrades >= 30 ? 'complete' : totalTrades >= 10 ? 'partial' : 'insufficient'
      }
    });
  } catch (error) {
    console.error('Win/Loss Expectation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}