import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { prisma } from '@/lib/prisma';

/**
 * Win/Loss/Expectation Report API
 * 
 * Database Architecture Notes:
 * - Uses PostgreSQL window functions for cumulative calculations
 * - Leverages indexes on userId, exitDate, symbol, side for optimal performance
 * - Implements proper NULL handling for edge cases
 * - Returns pre-aggregated data to minimize client-side processing
 */

interface WinLossMetrics {
  winRate: number;
  lossRate: number;
  winLossRatio: number;
  avgWin: number;
  avgLoss: number;
  expectation: number;
  profitFactor: number;
  totalTrades: number;
  wins: number;
  losses: number;
  scratches: number;
  largestWin: number;
  largestLoss: number;
  avgRiskRewardRatio: number;
}

interface CumulativeDataPoint {
  date: string;
  cumulativePnl: number;
  drawdown: number;
  drawdownPercent: number;
  trades: number;
}

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

    // Extract query parameters
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');

    // Build where clause for Prisma query
    const where: Prisma.TradeWhereInput = {
      userId: userId,
      status: 'CLOSED', // Only closed trades have realized P&L
    };

    // Add filters
    if (dateFrom || dateTo) {
      where.exitDate = {};
      if (dateFrom) {
        where.exitDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.exitDate.lte = endDate;
      }
    }

    if (symbol && symbol !== 'all') {
      where.symbol = symbol;
    }

    if (side && side !== 'all') {
      where.side = side.toUpperCase() as 'LONG' | 'SHORT';
    }

    // 1. Calculate Win/Loss Metrics using optimized aggregation
    const winLossMetrics = await calculateWinLossMetrics(userId, where);

    // 2. Get cumulative P&L and drawdown data
    const cumulativeData = await calculateCumulativeMetrics(userId, where);

    // 3. Get trade distribution by P&L ranges for histogram
    const pnlDistribution = await calculatePnlDistribution(userId, where);

    // 4. Get win/loss streaks
    const streaks = await calculateStreaks(userId, where);

    // 5. Get performance by trade duration (for win vs loss analysis)
    const durationAnalysis = await analyzeTradeDuration(userId, where);

    return NextResponse.json({
      metrics: winLossMetrics,
      cumulative: cumulativeData,
      distribution: pnlDistribution,
      streaks,
      durationAnalysis,
    });

  } catch (error) {
    console.error('Error fetching win/loss report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch win/loss report data' },
      { status: 500 }
    );
  }
}

/**
 * Calculate comprehensive win/loss metrics
 * Uses single aggregation query for performance
 */
async function calculateWinLossMetrics(
  userId: string, 
  where: Prisma.TradeWhereInput
): Promise<WinLossMetrics> {
  
  // Use raw SQL for complex aggregations - more efficient than multiple Prisma queries
  const result = await prisma.$queryRaw<Array<Record<string, number>>>`
    WITH trade_metrics AS (
      SELECT 
        pnl::NUMERIC as pnl,
        CASE 
          WHEN pnl > 0 THEN 'win'
          WHEN pnl < 0 THEN 'loss'
          ELSE 'scratch'
        END as outcome,
        ABS(pnl::NUMERIC) as abs_pnl
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        ${(typeof where.exitDate === 'object' && where.exitDate && 'gte' in where.exitDate) ? Prisma.sql`AND exit_date >= ${where.exitDate.gte}` : Prisma.empty}
        ${(typeof where.exitDate === 'object' && where.exitDate && 'lte' in where.exitDate) ? Prisma.sql`AND exit_date <= ${where.exitDate.lte}` : Prisma.empty}
        ${where.symbol ? Prisma.sql`AND symbol = ${where.symbol}` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
    )
    SELECT 
      COUNT(*) as total_trades,
      COUNT(*) FILTER (WHERE outcome = 'win') as wins,
      COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
      COUNT(*) FILTER (WHERE outcome = 'scratch') as scratches,
      COALESCE(AVG(pnl) FILTER (WHERE outcome = 'win'), 0) as avg_win,
      COALESCE(AVG(pnl) FILTER (WHERE outcome = 'loss'), 0) as avg_loss,
      COALESCE(MAX(pnl) FILTER (WHERE outcome = 'win'), 0) as largest_win,
      COALESCE(MIN(pnl) FILTER (WHERE outcome = 'loss'), 0) as largest_loss,
      COALESCE(SUM(pnl) FILTER (WHERE outcome = 'win'), 0) as total_wins,
      COALESCE(SUM(abs_pnl) FILTER (WHERE outcome = 'loss'), 0) as total_losses,
      COALESCE(AVG(pnl), 0) as avg_trade_pnl
    FROM trade_metrics
  `;

  const metrics = result[0] || {};
  
  const totalTrades = Number(metrics.total_trades) || 0;
  const wins = Number(metrics.wins) || 0;
  const losses = Number(metrics.losses) || 0;
  const scratches = Number(metrics.scratches) || 0;
  const avgWin = Number(metrics.avg_win) || 0;
  const avgLoss = Number(metrics.avg_loss) || 0;
  const totalWins = Number(metrics.total_wins) || 0;
  const totalLosses = Number(metrics.total_losses) || 0;

  // Calculate derived metrics
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losses / totalTrades) * 100 : 0;
  const winLossRatio = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
  
  // Expectation = (Win Rate × Avg Win) - (Loss Rate × |Avg Loss|)
  const expectation = (winRate / 100 * avgWin) - (lossRate / 100 * Math.abs(avgLoss));
  
  // Profit Factor = Total Wins / Total Losses
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  
  // Risk/Reward Ratio = |Avg Win| / |Avg Loss|
  const avgRiskRewardRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  return {
    winRate,
    lossRate,
    winLossRatio,
    avgWin,
    avgLoss,
    expectation,
    profitFactor,
    totalTrades,
    wins,
    losses,
    scratches,
    largestWin: Number(metrics.largest_win) || 0,
    largestLoss: Number(metrics.largest_loss) || 0,
    avgRiskRewardRatio,
  };
}

/**
 * Calculate cumulative P&L and drawdown over time
 * Uses window functions for efficient cumulative calculations
 */
async function calculateCumulativeMetrics(
  userId: string,
  where: Prisma.TradeWhereInput
): Promise<CumulativeDataPoint[]> {
  
  const result = await prisma.$queryRaw<Array<Record<string, number>>>`
    WITH daily_pnl AS (
      SELECT 
        DATE(exit_date) as trade_date,
        SUM(pnl::NUMERIC) as daily_pnl,
        COUNT(*) as daily_trades
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND exit_date IS NOT NULL
        ${(typeof where.exitDate === 'object' && where.exitDate && 'gte' in where.exitDate) ? Prisma.sql`AND exit_date >= ${where.exitDate.gte}` : Prisma.empty}
        ${(typeof where.exitDate === 'object' && where.exitDate && 'lte' in where.exitDate) ? Prisma.sql`AND exit_date <= ${where.exitDate.lte}` : Prisma.empty}
        ${where.symbol ? Prisma.sql`AND symbol = ${where.symbol}` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY DATE(exit_date)
    ),
    cumulative_metrics AS (
      SELECT 
        trade_date,
        daily_pnl,
        daily_trades,
        SUM(daily_pnl) OVER (ORDER BY trade_date) as cumulative_pnl,
        SUM(daily_trades) OVER (ORDER BY trade_date) as cumulative_trades,
        MAX(SUM(daily_pnl) OVER (ORDER BY trade_date)) OVER (ORDER BY trade_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_max
      FROM daily_pnl
    )
    SELECT 
      trade_date,
      cumulative_pnl,
      cumulative_trades,
      cumulative_pnl - running_max as drawdown,
      CASE 
        WHEN running_max > 0 THEN ((cumulative_pnl - running_max) / running_max) * 100
        ELSE 0
      END as drawdown_percent
    FROM cumulative_metrics
    ORDER BY trade_date
  `;

  return result.map(row => ({
    date: new Date(row.trade_date).toISOString().split('T')[0],
    cumulativePnl: Number(row.cumulative_pnl) || 0,
    drawdown: Number(row.drawdown) || 0,
    drawdownPercent: Number(row.drawdown_percent) || 0,
    trades: Number(row.cumulative_trades) || 0,
  }));
}

/**
 * Calculate P&L distribution for histogram
 * Groups trades into P&L ranges
 */
async function calculatePnlDistribution(
  userId: string,
  where: Prisma.TradeWhereInput
) {
  
  const result = await prisma.$queryRaw<Array<Record<string, number>>>`
    WITH pnl_ranges AS (
      SELECT 
        WIDTH_BUCKET(pnl::NUMERIC, -1000, 1000, 20) as bucket,
        COUNT(*) as count,
        AVG(pnl::NUMERIC) as avg_pnl,
        MIN(pnl::NUMERIC) as min_pnl,
        MAX(pnl::NUMERIC) as max_pnl
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        ${(typeof where.exitDate === 'object' && where.exitDate && 'gte' in where.exitDate) ? Prisma.sql`AND exit_date >= ${where.exitDate.gte}` : Prisma.empty}
        ${(typeof where.exitDate === 'object' && where.exitDate && 'lte' in where.exitDate) ? Prisma.sql`AND exit_date <= ${where.exitDate.lte}` : Prisma.empty}
        ${where.symbol ? Prisma.sql`AND symbol = ${where.symbol}` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY bucket
    )
    SELECT 
      CASE 
        WHEN bucket = 0 THEN '< -$1000'
        WHEN bucket = 21 THEN '> $1000'
        ELSE CONCAT('$', ROUND(-1000 + (bucket - 1) * 100)::TEXT, ' to $', ROUND(-1000 + bucket * 100)::TEXT)
      END as range,
      count,
      avg_pnl
    FROM pnl_ranges
    ORDER BY bucket
  `;

  return result.map(row => ({
    range: row.range,
    count: Number(row.count) || 0,
    avgPnl: Number(row.avg_pnl) || 0,
  }));
}

/**
 * Calculate consecutive win/loss streaks
 * Uses window functions to identify streaks
 */
async function calculateStreaks(
  userId: string,
  where: Prisma.TradeWhereInput
) {
  
  const result = await prisma.$queryRaw<Array<Record<string, number>>>`
    WITH trade_outcomes AS (
      SELECT 
        exit_date,
        CASE 
          WHEN pnl > 0 THEN 1
          WHEN pnl < 0 THEN -1
          ELSE 0
        END as outcome,
        ROW_NUMBER() OVER (ORDER BY exit_date) as rn
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND exit_date IS NOT NULL
        ${(typeof where.exitDate === 'object' && where.exitDate && 'gte' in where.exitDate) ? Prisma.sql`AND exit_date >= ${where.exitDate.gte}` : Prisma.empty}
        ${(typeof where.exitDate === 'object' && where.exitDate && 'lte' in where.exitDate) ? Prisma.sql`AND exit_date <= ${where.exitDate.lte}` : Prisma.empty}
        ${where.symbol ? Prisma.sql`AND symbol = ${where.symbol}` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
    ),
    streak_groups AS (
      SELECT 
        outcome,
        rn - ROW_NUMBER() OVER (PARTITION BY outcome ORDER BY exit_date) as grp
      FROM trade_outcomes
      WHERE outcome != 0
    ),
    streaks AS (
      SELECT 
        outcome,
        COUNT(*) as streak_length
      FROM streak_groups
      GROUP BY outcome, grp
    )
    SELECT 
      MAX(CASE WHEN outcome = 1 THEN streak_length ELSE 0 END) as max_win_streak,
      MAX(CASE WHEN outcome = -1 THEN streak_length ELSE 0 END) as max_loss_streak,
      AVG(CASE WHEN outcome = 1 THEN streak_length END) as avg_win_streak,
      AVG(CASE WHEN outcome = -1 THEN streak_length END) as avg_loss_streak,
      COUNT(DISTINCT CASE WHEN outcome = 1 THEN grp END) as win_streak_count,
      COUNT(DISTINCT CASE WHEN outcome = -1 THEN grp END) as loss_streak_count
    FROM streaks
  `;

  const streakData = result[0] || {};
  
  // Also get current streak
  const currentStreakResult = await prisma.$queryRaw<Array<{ current_streak: number; streak_type: string }>>`
    WITH recent_trades AS (
      SELECT 
        pnl,
        exit_date
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND exit_date IS NOT NULL
        ${where.symbol ? Prisma.sql`AND symbol = ${where.symbol}` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      ORDER BY exit_date DESC
      LIMIT 20
    ),
    streak_calc AS (
      SELECT 
        pnl,
        CASE 
          WHEN pnl > 0 THEN 'win'
          WHEN pnl < 0 THEN 'loss'
          ELSE 'scratch'
        END as outcome,
        ROW_NUMBER() OVER (ORDER BY exit_date DESC) as rn
      FROM recent_trades
    )
    SELECT 
      outcome,
      COUNT(*) as current_streak
    FROM streak_calc
    WHERE rn <= (
      SELECT MIN(rn) 
      FROM streak_calc s2 
      WHERE s2.outcome != (SELECT outcome FROM streak_calc WHERE rn = 1)
    ) - 1
    GROUP BY outcome
  `;

  const currentStreak = currentStreakResult[0] || { outcome: 'none', current_streak: 0 };

  return {
    maxWinStreak: Number(streakData.max_win_streak) || 0,
    maxLossStreak: Number(streakData.max_loss_streak) || 0,
    avgWinStreak: Number(streakData.avg_win_streak) || 0,
    avgLossStreak: Number(streakData.avg_loss_streak) || 0,
    currentStreak: {
      type: currentStreak.streak_type,
      count: Number(currentStreak.current_streak) || 0,
    },
  };
}

/**
 * Analyze trade duration for wins vs losses
 * Helps identify if holding time correlates with success
 */
async function analyzeTradeDuration(
  userId: string,
  where: Prisma.TradeWhereInput
) {
  
  const result = await prisma.$queryRaw<Array<Record<string, number>>>`
    WITH duration_analysis AS (
      SELECT 
        CASE 
          WHEN pnl > 0 THEN 'win'
          WHEN pnl < 0 THEN 'loss'
          ELSE 'scratch'
        END as outcome,
        time_in_trade,
        pnl::NUMERIC as pnl,
        CASE 
          WHEN time_in_trade < 60 THEN '< 1min'
          WHEN time_in_trade < 300 THEN '1-5min'
          WHEN time_in_trade < 900 THEN '5-15min'
          WHEN time_in_trade < 1800 THEN '15-30min'
          WHEN time_in_trade < 3600 THEN '30-60min'
          WHEN time_in_trade < 7200 THEN '1-2hr'
          WHEN time_in_trade < 14400 THEN '2-4hr'
          WHEN time_in_trade < 86400 THEN '4-24hr'
          ELSE '> 1day'
        END as duration_bucket
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND time_in_trade IS NOT NULL
        ${(typeof where.exitDate === 'object' && where.exitDate && 'gte' in where.exitDate) ? Prisma.sql`AND exit_date >= ${where.exitDate.gte}` : Prisma.empty}
        ${(typeof where.exitDate === 'object' && where.exitDate && 'lte' in where.exitDate) ? Prisma.sql`AND exit_date <= ${where.exitDate.lte}` : Prisma.empty}
        ${where.symbol ? Prisma.sql`AND symbol = ${where.symbol}` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
    )
    SELECT 
      duration_bucket,
      COUNT(*) FILTER (WHERE outcome = 'win') as wins,
      COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
      AVG(pnl) FILTER (WHERE outcome = 'win') as avg_win,
      AVG(pnl) FILTER (WHERE outcome = 'loss') as avg_loss,
      SUM(pnl) as total_pnl
    FROM duration_analysis
    GROUP BY duration_bucket
    ORDER BY 
      CASE duration_bucket
        WHEN '< 1min' THEN 1
        WHEN '1-5min' THEN 2
        WHEN '5-15min' THEN 3
        WHEN '15-30min' THEN 4
        WHEN '30-60min' THEN 5
        WHEN '1-2hr' THEN 6
        WHEN '2-4hr' THEN 7
        WHEN '4-24hr' THEN 8
        ELSE 9
      END
  `;

  return result.map(row => ({
    duration: row.duration_bucket,
    wins: Number(row.wins) || 0,
    losses: Number(row.losses) || 0,
    winRate: row.wins + row.losses > 0 
      ? (Number(row.wins) / (Number(row.wins) + Number(row.losses))) * 100 
      : 0,
    avgWin: Number(row.avg_win) || 0,
    avgLoss: Number(row.avg_loss) || 0,
    totalPnl: Number(row.total_pnl) || 0,
  }));
}