import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradeFilterService } from '@/lib/services/tradeFilterService';

/**
 * Win vs Loss Days Report API
 * 
 * This endpoint analyzes trading performance by grouping trades into winning and losing days.
 * It provides comprehensive metrics for each group to help identify patterns in successful vs unsuccessful trading days.
 */

interface DayMetrics {
  totalGainLoss: number;
  avgDailyGainLoss: number;
  avgDailyVolume: number;
  avgPerShareGainLoss: number;
  avgTradeGainLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  tradeStdDev: number;
  avgHoldWinning: number;
  avgHoldLosing: number;
  profitFactor: number;
  largestGain: number;
  largestLoss: number;
  totalCommissions: number;
  totalFees: number;
}

interface WinLossDaysResponse {
  winningDays: DayMetrics;
  losingDays: DayMetrics;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Use centralized filter service to ensure consistency with all other APIs
    const searchParams = request.nextUrl.searchParams;
    const filters = TradeFilterService.parseFiltersFromRequest(searchParams, user.id);
    
    // Debug logging to verify filters
    TradeFilterService.logFilters('WIN-LOSS-DAYS', filters);

    // Calculate metrics for winning and losing days
    const dayMetrics = await calculateDayMetrics(filters);

    // Debug logging - check raw trades first
    const rawTrades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        status: 'CLOSED',
        exitDate: { not: null }
      },
      select: {
        symbol: true,
        pnl: true,
        exitDate: true,
        quantity: true
      },
      orderBy: { exitDate: 'desc' },
      take: 10
    });

    console.log('\n=== WIN-LOSS-DAYS API DEBUG ===');
    console.log('User ID:', user.id);
    console.log('Filters:', filters);
    console.log('Raw Recent Trades:', JSON.stringify(rawTrades, null, 2));
    console.log('Winning Days Metrics:', JSON.stringify(dayMetrics.winningDays, null, 2));
    console.log('Losing Days Metrics:', JSON.stringify(dayMetrics.losingDays, null, 2));
    console.log('================================\n');

    // Prepare response with debug info
    const response: WinLossDaysResponse & { debug?: Record<string, unknown> } = {
      winningDays: dayMetrics.winningDays,
      losingDays: dayMetrics.losingDays,
      debug: {
        userId: user.id,
        rawTradesCount: rawTrades.length,
        rawTrades: rawTrades,
        filters: filters
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching win/loss days report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch win/loss days report data' },
      { status: 500 }
    );
  }
}

/**
 * Calculate comprehensive metrics for winning and losing days
 */
async function calculateDayMetrics(filters: {
  userId: string;
  symbol?: string;
  side?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  duration?: string;
  showOpenTrades?: boolean;
}): Promise<{
  winningDays: DayMetrics;
  losingDays: DayMetrics;
}> {
  
  // Use centralized filtering to get ONLY the trades that match global filters
  const whereClause = TradeFilterService.buildWhereClause(filters);
  
  // First, get the filtered trades using Prisma to ensure exact same filtering as other APIs
  const filteredTrades = await prisma.trade.findMany({
    where: whereClause,
    select: {
      exitDate: true,
      pnl: true,
      quantity: true,
      symbol: true,
      side: true,
      commission: true,
      fees: true,
      timeInTrade: true,
      entryDate: true
    }
  });

  console.log('\n=== WIN VS LOSS DAYS API DEBUG ===');
  console.log('User ID:', filters.userId);
  console.log('TradeFilterService whereClause:', JSON.stringify(whereClause, null, 2));
  console.log(`Found ${filteredTrades.length} filtered trades for win/loss analysis`);
  console.log('Filtered trades details:');
  filteredTrades.forEach((trade, index) => {
    console.log(`  ${index + 1}. ${trade.symbol} | ExitDate: ${trade.exitDate?.toISOString().split('T')[0] || 'N/A'} | PnL: ${trade.pnl} | Quantity: ${trade.quantity}`);
  });
  console.log('=====================================\n');

  // Group by day to calculate daily P&L
  const dailyPnlMap = new Map<string, { daily_pnl: number; daily_volume: number; trade_count: number }>();
  
  filteredTrades.forEach(trade => {
    if (!trade.exitDate) return;
    
    const dateKey = trade.exitDate.toISOString().split('T')[0];
    const existing = dailyPnlMap.get(dateKey) || { daily_pnl: 0, daily_volume: 0, trade_count: 0 };
    
    existing.daily_pnl += Number(trade.pnl);
    existing.daily_volume += Number(trade.quantity) || 0;
    existing.trade_count += 1;
    
    dailyPnlMap.set(dateKey, existing);
  });

  const dailyPnlResult = Array.from(dailyPnlMap.entries()).map(([dateStr, data]) => ({
    trade_date: new Date(dateStr),
    daily_pnl: data.daily_pnl,
    daily_volume: data.daily_volume,
    trade_count: data.trade_count
  })).sort((a, b) => a.trade_date.getTime() - b.trade_date.getTime());

  console.log('Daily P&L Result (grouped by exitDate):');
  dailyPnlResult.forEach(day => {
    console.log(`  Date: ${day.trade_date.toISOString().split('T')[0]} | P&L: ${day.daily_pnl} | Trades: ${day.trade_count} | Volume: ${day.daily_volume}`);
  });

  // Separate winning and losing days
  const winningDates = dailyPnlResult
    .filter(day => Number(day.daily_pnl) > 0)
    .map(day => day.trade_date);
  
  const losingDates = dailyPnlResult
    .filter(day => Number(day.daily_pnl) <= 0)
    .map(day => day.trade_date);

  console.log('Winning Dates:', winningDates);
  console.log('Losing Dates:', losingDates);

  // Convert Decimal types to numbers for the metrics calculation
  const convertedTrades = filteredTrades.map(trade => ({
    ...trade,
    pnl: typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl,
    quantity: trade.quantity || 0,
    commission: typeof trade.commission === 'object' && trade.commission ? trade.commission.toNumber() : null,
    fees: typeof trade.fees === 'object' && trade.fees ? trade.fees.toNumber() : null,
    side: trade.side.toString()
  }));

  // Calculate metrics for winning days using pre-filtered trades
  const winningDaysMetrics = winningDates.length > 0
    ? await calculateMetricsForDays(convertedTrades, winningDates)
    : createEmptyMetrics();

  // Calculate metrics for losing days using pre-filtered trades
  const losingDaysMetrics = losingDates.length > 0
    ? await calculateMetricsForDays(convertedTrades, losingDates)
    : createEmptyMetrics();

  return {
    winningDays: winningDaysMetrics,
    losingDays: losingDaysMetrics,
  };
}

/**
 * Calculate detailed metrics for a specific set of days
 */
async function calculateMetricsForDays(
  preFilteredTrades: Array<{
    exitDate: Date | null;
    pnl: number;
    quantity: number;
    symbol: string;
    side: string;
    commission: number | null;
    fees: number | null;
    timeInTrade: number | null;
    entryDate: Date;
  }>,
  dates: Date[]
): Promise<DayMetrics> {
  
  if (dates.length === 0) {
    return createEmptyMetrics();
  }

  // Filter the pre-filtered trades to only include those from the specified dates
  const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
  const trades = preFilteredTrades.filter(trade => {
    if (!trade.exitDate) return false;
    const tradeDateString = trade.exitDate.toISOString().split('T')[0];
    return dateStrings.includes(tradeDateString);
  });

  console.log(`Using ${trades.length} pre-filtered trades for specific dates:`, dateStrings);

  if (trades.length === 0) {
    return createEmptyMetrics();
  }

  // Calculate metrics using the filtered trades
  let totalPnl = 0;
  let totalVolume = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let largestGain = 0;
  let largestLoss = 0;
  let totalCommissions = 0;
  let totalFees = 0;
  let totalHoldWinning = 0;
  let totalHoldLosing = 0;
  let winningHoldCount = 0;
  let losingHoldCount = 0;
  const pnlValues: number[] = [];

  trades.forEach(trade => {
    const pnl = Number(trade.pnl) || 0;
    const quantity = Number(trade.quantity) || 0;
    const commission = Number(trade.commission) || 0;
    const fees = Number(trade.fees) || 0;
    
    totalPnl += pnl;
    totalVolume += quantity;
    totalCommissions += commission;
    totalFees += fees;
    pnlValues.push(pnl);

    // Calculate hold time
    let holdTime = 0;
    if (trade.timeInTrade) {
      holdTime = Number(trade.timeInTrade);
    } else if (trade.exitDate && trade.entryDate) {
      holdTime = (trade.exitDate.getTime() - trade.entryDate.getTime()) / 1000;
    }

    if (pnl > 0) {
      winningTrades++;
      totalWins += pnl;
      largestGain = Math.max(largestGain, pnl);
      totalHoldWinning += holdTime;
      winningHoldCount++;
    } else if (pnl < 0) {
      losingTrades++;
      totalLosses += Math.abs(pnl);
      largestLoss = Math.min(largestLoss, pnl);
      totalHoldLosing += holdTime;
      losingHoldCount++;
    }
  });

  // Calculate derived metrics
  const totalTrades = trades.length;
  const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const avgHoldWinning = winningHoldCount > 0 ? totalHoldWinning / winningHoldCount : 0;
  const avgHoldLosing = losingHoldCount > 0 ? totalHoldLosing / losingHoldCount : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? 999999 : 0);
  
  // Calculate standard deviation
  const avgPnl = totalPnl / totalTrades;
  const variance = pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - avgPnl, 2), 0) / totalTrades;
  const stdDev = Math.sqrt(variance);

  // Count unique days
  const uniqueDays = new Set(trades.map(t => t.exitDate?.toISOString().split('T')[0])).size;

  return {
    totalGainLoss: totalPnl,
    avgDailyGainLoss: uniqueDays > 0 ? totalPnl / uniqueDays : 0,
    avgDailyVolume: uniqueDays > 0 ? totalVolume / uniqueDays : 0,
    avgPerShareGainLoss: totalVolume > 0 ? totalPnl / totalVolume : 0,
    avgTradeGainLoss: totalTrades > 0 ? totalPnl / totalTrades : 0,
    totalTrades: totalTrades,
    winningTrades: winningTrades,
    losingTrades: losingTrades,
    avgWinningTrade: avgWin,
    avgLosingTrade: losingTrades > 0 ? -avgLoss : 0, // Make sure losing trade average is negative
    tradeStdDev: stdDev,
    avgHoldWinning: avgHoldWinning,
    avgHoldLosing: avgHoldLosing,
    profitFactor: profitFactor,
    largestGain: largestGain,
    largestLoss: largestLoss,
    totalCommissions: totalCommissions,
    totalFees: totalFees,
  };
}

/**
 * Create empty metrics object for edge cases
 */
function createEmptyMetrics(): DayMetrics {
  return {
    totalGainLoss: 0,
    avgDailyGainLoss: 0,
    avgDailyVolume: 0,
    avgPerShareGainLoss: 0,
    avgTradeGainLoss: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    avgWinningTrade: 0,
    avgLosingTrade: 0,
    tradeStdDev: 0,
    avgHoldWinning: 0,
    avgHoldLosing: 0,
    profitFactor: 0,
    largestGain: 0,
    largestLoss: 0,
    totalCommissions: 0,
    totalFees: 0,
  };
}