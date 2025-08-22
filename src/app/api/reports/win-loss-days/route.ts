import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

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

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');

    // Prepare filter parameters
    const filters = {
      userId: user.id,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? (() => {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        return endDate;
      })() : undefined,
      symbol: symbol && symbol !== 'all' ? symbol : undefined,
      side: side && side !== 'all' ? side.toUpperCase() : undefined,
    };

    // Calculate metrics for winning and losing days
    const dayMetrics = await calculateDayMetrics(filters);

    // Prepare response
    const response: WinLossDaysResponse = {
      winningDays: dayMetrics.winningDays,
      losingDays: dayMetrics.losingDays,
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
  dateFrom?: Date;
  dateTo?: Date;
  symbol?: string;
  side?: string;
}): Promise<{
  winningDays: DayMetrics;
  losingDays: DayMetrics;
}> {
  
  // First, calculate daily P&L to determine winning vs losing days
  const dailyPnlResult = await prisma.$queryRaw<Array<{
    trade_date: Date;
    daily_pnl: number;
    daily_volume: number;
    trade_count: number;
  }>>`
    WITH daily_aggregates AS (
      SELECT 
        DATE("exitDate") as trade_date,
        SUM(pnl::NUMERIC) as daily_pnl,
        SUM(quantity) as daily_volume,
        COUNT(*) as trade_count
      FROM trades
      WHERE 
        "userId" = ${filters.userId}
        AND status = 'CLOSED'
        AND "exitDate" IS NOT NULL
        ${filters.dateFrom ? Prisma.sql`AND "exitDate" >= ${filters.dateFrom}` : Prisma.empty}
        ${filters.dateTo ? Prisma.sql`AND "exitDate" <= ${filters.dateTo}` : Prisma.empty}
        ${filters.symbol ? Prisma.sql`AND symbol = ${filters.symbol}` : Prisma.empty}
        ${filters.side ? Prisma.sql`AND side = ${filters.side}` : Prisma.empty}
      GROUP BY DATE("exitDate")
    )
    SELECT 
      trade_date,
      daily_pnl,
      daily_volume,
      trade_count
    FROM daily_aggregates
    ORDER BY trade_date
  `;

  // Separate winning and losing days
  const winningDates = dailyPnlResult
    .filter(day => Number(day.daily_pnl) > 0)
    .map(day => day.trade_date);
  
  const losingDates = dailyPnlResult
    .filter(day => Number(day.daily_pnl) <= 0)
    .map(day => day.trade_date);

  // Calculate metrics for winning days
  const winningDaysMetrics = winningDates.length > 0
    ? await calculateMetricsForDays(filters, winningDates)
    : createEmptyMetrics();

  // Calculate metrics for losing days
  const losingDaysMetrics = losingDates.length > 0
    ? await calculateMetricsForDays(filters, losingDates)
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
  filters: {
    userId: string;
    dateFrom?: Date;
    dateTo?: Date;
    symbol?: string;
    side?: string;
  },
  dates: Date[]
): Promise<DayMetrics> {
  
  if (dates.length === 0) {
    return createEmptyMetrics();
  }

  // Build date filter using IN clause with string dates
  const dateStrings = dates.map(d => d.toISOString().split('T')[0]);

  // Execute comprehensive metrics query
  const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    WITH trade_metrics AS (
      SELECT 
        DATE("exitDate") as trade_date,
        pnl::NUMERIC as pnl,
        quantity,
        CASE 
          WHEN quantity > 0 THEN pnl::NUMERIC / quantity 
          ELSE 0 
        END as per_share_pnl,
        COALESCE(commission, 0)::NUMERIC as commission,
        COALESCE(fees, 0)::NUMERIC as fees,
        CASE 
          WHEN "timeInTrade" IS NOT NULL THEN "timeInTrade" 
          ELSE EXTRACT(EPOCH FROM ("exitDate" - "entryDate"))
        END as hold_time_seconds,
        CASE 
          WHEN pnl > 0 THEN 'win'
          WHEN pnl < 0 THEN 'loss'
          ELSE 'scratch'
        END as outcome
      FROM trades
      WHERE 
        "userId" = ${filters.userId}
        AND status = 'CLOSED'
        AND "exitDate" IS NOT NULL
        AND DATE("exitDate")::text = ANY(${dateStrings})
        ${filters.symbol ? Prisma.sql`AND symbol = ${filters.symbol}` : Prisma.empty}
        ${filters.side ? Prisma.sql`AND side = ${filters.side}` : Prisma.empty}
    ),
    daily_aggregates AS (
      SELECT 
        trade_date,
        SUM(pnl) as daily_pnl,
        SUM(quantity) as daily_volume,
        COUNT(*) as daily_trades
      FROM trade_metrics
      GROUP BY trade_date
    ),
    overall_metrics AS (
      SELECT 
        -- Day-level metrics
        COUNT(DISTINCT trade_date) as day_count,
        SUM(daily_pnl) as total_pnl,
        AVG(daily_pnl) as avg_daily_pnl,
        AVG(daily_volume) as avg_daily_volume
      FROM daily_aggregates
    ),
    trade_level_metrics AS (
      SELECT 
        -- Trade-level metrics
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE outcome = 'win') as winning_trades,
        COUNT(*) FILTER (WHERE outcome = 'loss') as losing_trades,
        AVG(pnl) as avg_trade_pnl,
        AVG(per_share_pnl) as avg_per_share_pnl,
        COALESCE(AVG(pnl) FILTER (WHERE outcome = 'win'), 0) as avg_win,
        COALESCE(AVG(pnl) FILTER (WHERE outcome = 'loss'), 0) as avg_loss,
        COALESCE(MAX(pnl), 0) as largest_gain,
        COALESCE(MIN(pnl), 0) as largest_loss,
        COALESCE(STDDEV(pnl), 0) as trade_pnl_std_dev,
        COALESCE(AVG(hold_time_seconds) FILTER (WHERE outcome = 'win'), 0) as avg_hold_winning,
        COALESCE(AVG(hold_time_seconds) FILTER (WHERE outcome = 'loss'), 0) as avg_hold_losing,
        COALESCE(SUM(pnl) FILTER (WHERE outcome = 'win'), 0) as total_wins,
        COALESCE(SUM(ABS(pnl)) FILTER (WHERE outcome = 'loss'), 0) as total_losses,
        SUM(commission) as total_commissions,
        SUM(fees) as total_fees
      FROM trade_metrics
    )
    SELECT 
      om.total_pnl,
      om.avg_daily_pnl,
      om.avg_daily_volume,
      tm.total_trades,
      tm.winning_trades,
      tm.losing_trades,
      tm.avg_trade_pnl,
      tm.avg_per_share_pnl,
      tm.avg_win,
      tm.avg_loss,
      tm.largest_gain,
      tm.largest_loss,
      tm.trade_pnl_std_dev,
      tm.avg_hold_winning,
      tm.avg_hold_losing,
      CASE 
        WHEN tm.total_losses > 0 THEN tm.total_wins / tm.total_losses
        WHEN tm.total_wins > 0 THEN 999999
        ELSE 0
      END as profit_factor,
      tm.total_commissions,
      tm.total_fees
    FROM overall_metrics om
    CROSS JOIN trade_level_metrics tm
  `;

  const metrics = result[0] || {};

  return {
    totalGainLoss: Number(metrics.total_pnl) || 0,
    avgDailyGainLoss: Number(metrics.avg_daily_pnl) || 0,
    avgDailyVolume: Number(metrics.avg_daily_volume) || 0,
    avgPerShareGainLoss: Number(metrics.avg_per_share_pnl) || 0,
    avgTradeGainLoss: Number(metrics.avg_trade_pnl) || 0,
    totalTrades: Number(metrics.total_trades) || 0,
    winningTrades: Number(metrics.winning_trades) || 0,
    losingTrades: Number(metrics.losing_trades) || 0,
    avgWinningTrade: Number(metrics.avg_win) || 0,
    avgLosingTrade: Number(metrics.avg_loss) || 0,
    tradeStdDev: Number(metrics.trade_pnl_std_dev) || 0,
    avgHoldWinning: Number(metrics.avg_hold_winning) || 0,
    avgHoldLosing: Number(metrics.avg_hold_losing) || 0,
    profitFactor: Number(metrics.profit_factor) || 0,
    largestGain: Number(metrics.largest_gain) || 0,
    largestLoss: Number(metrics.largest_loss) || 0,
    totalCommissions: Number(metrics.total_commissions) || 0,
    totalFees: Number(metrics.total_fees) || 0,
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