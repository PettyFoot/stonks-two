/**
 * Trade Aggregation Functions
 * 
 * Database-optimized aggregation utilities for trade analytics.
 * These functions leverage PostgreSQL's advanced features for performance:
 * - Window functions for running calculations
 * - CTEs for complex multi-step aggregations
 * - Proper indexing strategies
 * - Efficient NULL handling
 * 
 * Performance considerations:
 * - Uses raw SQL for complex aggregations (10-100x faster than ORM)
 * - Leverages database indexes on userId, exitDate, symbol, side
 * - Minimizes data transfer by aggregating in database
 * - Returns pre-formatted data for direct chart consumption
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Calculate Kelly Criterion for position sizing
 * Kelly % = (Win Rate × Avg Win/Avg Loss - Loss Rate) / (Avg Win/Avg Loss)
 */
export async function calculateKellyCriterion(
  userId: string,
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
): Promise<number> {
  const filterConditions = buildFilterConditions(filters);
  
  const result = await prisma.$queryRaw<any[]>`
    WITH trade_stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE pnl > 0) as wins,
        COUNT(*) FILTER (WHERE pnl < 0) as losses,
        AVG(pnl) FILTER (WHERE pnl > 0) as avg_win,
        AVG(ABS(pnl)) FILTER (WHERE pnl < 0) as avg_loss
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        ${filterConditions}
    )
    SELECT 
      CASE 
        WHEN avg_loss = 0 OR avg_loss IS NULL THEN 0
        WHEN wins + losses = 0 THEN 0
        ELSE (
          (wins::FLOAT / (wins + losses) * (avg_win / avg_loss)) - 
          (losses::FLOAT / (wins + losses))
        ) / (avg_win / avg_loss)
      END as kelly_percentage
    FROM trade_stats
  `;

  return Math.max(0, Math.min(0.25, Number(result[0]?.kelly_percentage || 0))); // Cap at 25%
}

/**
 * Calculate Sharpe Ratio
 * Sharpe = (Mean Return - Risk Free Rate) / StdDev of Returns
 * Using 0% risk-free rate for simplicity
 */
export async function calculateSharpeRatio(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
): Promise<number> {
  const filterConditions = buildFilterConditions(filters);
  const periodTrunc = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
  
  const result = await prisma.$queryRaw<any[]>`
    WITH period_returns AS (
      SELECT 
        DATE_TRUNC('${Prisma.raw(periodTrunc)}', exit_date) as period,
        SUM(pnl::NUMERIC) as period_return
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND exit_date IS NOT NULL
        ${filterConditions}
      GROUP BY DATE_TRUNC('${Prisma.raw(periodTrunc)}', exit_date)
    ),
    stats AS (
      SELECT 
        AVG(period_return) as mean_return,
        STDDEV(period_return) as std_dev,
        COUNT(*) as periods
      FROM period_returns
    )
    SELECT 
      CASE 
        WHEN std_dev = 0 OR std_dev IS NULL THEN 0
        WHEN periods < 2 THEN 0
        ELSE mean_return / std_dev * SQRT(
          CASE '${Prisma.raw(period)}'
            WHEN 'daily' THEN 252    -- Trading days per year
            WHEN 'weekly' THEN 52    -- Weeks per year
            WHEN 'monthly' THEN 12   -- Months per year
          END
        )
      END as sharpe_ratio
    FROM stats
  `;

  return Number(result[0]?.sharpe_ratio || 0);
}

/**
 * Calculate Maximum Drawdown and related metrics
 */
export async function calculateDrawdownMetrics(
  userId: string,
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
): Promise<{
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // in days
  currentDrawdown: number;
  currentDrawdownPercent: number;
  recoveryTime: number | null; // days to recover from max drawdown
}> {
  const filterConditions = buildFilterConditions(filters);
  
  const result = await prisma.$queryRaw<any[]>`
    WITH cumulative_pnl AS (
      SELECT 
        exit_date,
        SUM(pnl::NUMERIC) OVER (ORDER BY exit_date) as cum_pnl,
        MAX(SUM(pnl::NUMERIC) OVER (ORDER BY exit_date)) 
          OVER (ORDER BY exit_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_max
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND exit_date IS NOT NULL
        ${filterConditions}
    ),
    drawdowns AS (
      SELECT 
        exit_date,
        cum_pnl,
        running_max,
        cum_pnl - running_max as drawdown,
        CASE 
          WHEN running_max > 0 THEN ((cum_pnl - running_max) / running_max) * 100
          ELSE 0
        END as drawdown_percent,
        CASE 
          WHEN cum_pnl < running_max THEN 1
          ELSE 0
        END as in_drawdown
      FROM cumulative_pnl
    ),
    drawdown_periods AS (
      SELECT 
        exit_date,
        drawdown,
        drawdown_percent,
        in_drawdown,
        SUM(CASE WHEN in_drawdown = 0 THEN 1 ELSE 0 END) 
          OVER (ORDER BY exit_date) as drawdown_group
      FROM drawdowns
    ),
    drawdown_stats AS (
      SELECT 
        drawdown_group,
        MIN(exit_date) as start_date,
        MAX(exit_date) as end_date,
        MIN(drawdown) as period_max_drawdown,
        MIN(drawdown_percent) as period_max_drawdown_percent,
        COUNT(*) as days_in_drawdown
      FROM drawdown_periods
      WHERE in_drawdown = 1
      GROUP BY drawdown_group
    )
    SELECT 
      COALESCE(MIN(d.period_max_drawdown), 0) as max_drawdown,
      COALESCE(MIN(d.period_max_drawdown_percent), 0) as max_drawdown_percent,
      COALESCE(MAX(d.days_in_drawdown), 0) as max_drawdown_duration,
      COALESCE((SELECT drawdown FROM drawdowns ORDER BY exit_date DESC LIMIT 1), 0) as current_drawdown,
      COALESCE((SELECT drawdown_percent FROM drawdowns ORDER BY exit_date DESC LIMIT 1), 0) as current_drawdown_percent
    FROM drawdown_stats d
  `;

  const metrics = result[0] || {};
  
  // Calculate recovery time from max drawdown
  const recoveryResult = await prisma.$queryRaw<any[]>`
    WITH max_dd_date AS (
      SELECT exit_date as dd_date
      FROM (
        SELECT 
          exit_date,
          SUM(pnl::NUMERIC) OVER (ORDER BY exit_date) - 
          MAX(SUM(pnl::NUMERIC) OVER (ORDER BY exit_date)) 
            OVER (ORDER BY exit_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as drawdown
        FROM trades
        WHERE 
          user_id = ${userId}
          AND status = 'CLOSED'
          AND exit_date IS NOT NULL
          ${filterConditions}
      ) t
      ORDER BY drawdown
      LIMIT 1
    ),
    recovery AS (
      SELECT MIN(exit_date) as recovery_date
      FROM (
        SELECT 
          exit_date,
          SUM(pnl::NUMERIC) OVER (ORDER BY exit_date) as cum_pnl
        FROM trades
        WHERE 
          user_id = ${userId}
          AND status = 'CLOSED'
          AND exit_date > (SELECT dd_date FROM max_dd_date)
          ${filterConditions}
      ) t
      WHERE cum_pnl >= (
        SELECT MAX(SUM(pnl::NUMERIC) OVER (ORDER BY exit_date))
        FROM trades
        WHERE 
          user_id = ${userId}
          AND status = 'CLOSED'
          AND exit_date <= (SELECT dd_date FROM max_dd_date)
          ${filterConditions}
      )
    )
    SELECT 
      EXTRACT(DAY FROM (
        (SELECT recovery_date FROM recovery) - (SELECT dd_date FROM max_dd_date)
      )) as recovery_days
  `;

  return {
    maxDrawdown: Number(metrics.max_drawdown) || 0,
    maxDrawdownPercent: Number(metrics.max_drawdown_percent) || 0,
    maxDrawdownDuration: Number(metrics.max_drawdown_duration) || 0,
    currentDrawdown: Number(metrics.current_drawdown) || 0,
    currentDrawdownPercent: Number(metrics.current_drawdown_percent) || 0,
    recoveryTime: recoveryResult[0]?.recovery_days || null,
  };
}

/**
 * Calculate R-Multiple distribution
 * R-Multiple = Profit or Loss / Initial Risk
 */
export async function calculateRMultiples(
  userId: string,
  initialRisk: number = 100, // Default $100 risk per trade
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
): Promise<{
  distribution: Array<{ rMultiple: string; count: number; totalPnl: number }>;
  avgRMultiple: number;
  expectancy: number;
}> {
  const filterConditions = buildFilterConditions(filters);
  
  const result = await prisma.$queryRaw<any[]>`
    WITH r_multiples AS (
      SELECT 
        pnl::NUMERIC / ${initialRisk} as r_multiple,
        pnl::NUMERIC as pnl,
        CASE 
          WHEN pnl::NUMERIC / ${initialRisk} < -2 THEN '< -2R'
          WHEN pnl::NUMERIC / ${initialRisk} < -1 THEN '-2R to -1R'
          WHEN pnl::NUMERIC / ${initialRisk} < 0 THEN '-1R to 0R'
          WHEN pnl::NUMERIC / ${initialRisk} < 1 THEN '0R to 1R'
          WHEN pnl::NUMERIC / ${initialRisk} < 2 THEN '1R to 2R'
          WHEN pnl::NUMERIC / ${initialRisk} < 3 THEN '2R to 3R'
          WHEN pnl::NUMERIC / ${initialRisk} < 5 THEN '3R to 5R'
          ELSE '> 5R'
        END as r_bucket
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        ${filterConditions}
    )
    SELECT 
      r_bucket,
      COUNT(*) as count,
      SUM(pnl) as total_pnl,
      AVG(r_multiple) as avg_r
    FROM r_multiples
    GROUP BY r_bucket
    ORDER BY 
      CASE r_bucket
        WHEN '< -2R' THEN 1
        WHEN '-2R to -1R' THEN 2
        WHEN '-1R to 0R' THEN 3
        WHEN '0R to 1R' THEN 4
        WHEN '1R to 2R' THEN 5
        WHEN '2R to 3R' THEN 6
        WHEN '3R to 5R' THEN 7
        ELSE 8
      END
  `;

  const statsResult = await prisma.$queryRaw<any[]>`
    SELECT 
      AVG(pnl::NUMERIC / ${initialRisk}) as avg_r_multiple,
      SUM(pnl::NUMERIC / ${initialRisk}) / COUNT(*) as expectancy
    FROM trades
    WHERE 
      user_id = ${userId}
      AND status = 'CLOSED'
      ${filterConditions}
  `;

  const stats = statsResult[0] || {};

  return {
    distribution: result.map(row => ({
      rMultiple: row.r_bucket,
      count: Number(row.count) || 0,
      totalPnl: Number(row.total_pnl) || 0,
    })),
    avgRMultiple: Number(stats.avg_r_multiple) || 0,
    expectancy: Number(stats.expectancy) || 0,
  };
}

/**
 * Calculate performance by market conditions
 * Requires market data integration for VIX, volume, etc.
 */
export async function calculateMarketConditionPerformance(
  userId: string,
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
) {
  const filterConditions = buildFilterConditions(filters);
  
  // This would require market data integration
  // For now, we'll analyze by volatility of returns
  const result = await prisma.$queryRaw<any[]>`
    WITH daily_volatility AS (
      SELECT 
        DATE(exit_date) as trade_date,
        STDDEV(pnl::NUMERIC) OVER (
          ORDER BY DATE(exit_date) 
          ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) as rolling_volatility,
        SUM(pnl::NUMERIC) as daily_pnl,
        COUNT(*) as daily_trades
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND exit_date IS NOT NULL
        ${filterConditions}
      GROUP BY DATE(exit_date), exit_date, pnl
    ),
    volatility_buckets AS (
      SELECT 
        CASE 
          WHEN rolling_volatility < 50 THEN 'Low Volatility'
          WHEN rolling_volatility < 100 THEN 'Medium Volatility'
          ELSE 'High Volatility'
        END as volatility_regime,
        daily_pnl,
        daily_trades
      FROM daily_volatility
      WHERE rolling_volatility IS NOT NULL
    )
    SELECT 
      volatility_regime,
      COUNT(*) as trading_days,
      SUM(daily_trades) as total_trades,
      SUM(daily_pnl) as total_pnl,
      AVG(daily_pnl) as avg_daily_pnl,
      STDDEV(daily_pnl) as pnl_volatility,
      CASE 
        WHEN STDDEV(daily_pnl) > 0 THEN AVG(daily_pnl) / STDDEV(daily_pnl)
        ELSE 0
      END as sharpe_ratio
    FROM volatility_buckets
    GROUP BY volatility_regime
    ORDER BY volatility_regime
  `;

  return result.map(row => ({
    condition: row.volatility_regime,
    tradingDays: Number(row.trading_days) || 0,
    totalTrades: Number(row.total_trades) || 0,
    totalPnl: Number(row.total_pnl) || 0,
    avgDailyPnl: Number(row.avg_daily_pnl) || 0,
    sharpeRatio: Number(row.sharpe_ratio) || 0,
  }));
}

/**
 * Calculate trade quality metrics
 * MFE (Maximum Favorable Excursion) and MAE (Maximum Adverse Excursion)
 */
export async function calculateTradeQualityMetrics(
  userId: string,
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
) {
  const filterConditions = buildFilterConditions(filters);
  
  // Note: This requires high/low during trade data
  // Using available data for approximation
  const result = await prisma.$queryRaw<any[]>`
    WITH trade_quality AS (
      SELECT 
        pnl::NUMERIC as pnl,
        CASE 
          WHEN side = 'LONG' THEN 
            GREATEST(0, (high_during_trade - avg_entry_price) * quantity)
          ELSE 
            GREATEST(0, (avg_entry_price - low_during_trade) * quantity)
        END as mfe,
        CASE 
          WHEN side = 'LONG' THEN 
            GREATEST(0, (avg_entry_price - low_during_trade) * quantity)
          ELSE 
            GREATEST(0, (high_during_trade - avg_entry_price) * quantity)
        END as mae,
        time_in_trade
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        AND high_during_trade IS NOT NULL
        AND low_during_trade IS NOT NULL
        ${filterConditions}
    )
    SELECT 
      AVG(CASE WHEN mfe > 0 THEN pnl / mfe ELSE 0 END) as avg_pnl_to_mfe_ratio,
      AVG(CASE WHEN mae > 0 THEN ABS(pnl) / mae ELSE 0 END) as avg_pnl_to_mae_ratio,
      AVG(mfe) as avg_mfe,
      AVG(mae) as avg_mae,
      COUNT(*) FILTER (WHERE pnl > 0 AND mfe > 0 AND pnl / mfe > 0.7) as good_exits,
      COUNT(*) FILTER (WHERE pnl < 0 AND mae > 0) as poor_entries,
      AVG(CASE WHEN pnl > 0 THEN time_in_trade END) as avg_win_time,
      AVG(CASE WHEN pnl < 0 THEN time_in_trade END) as avg_loss_time
    FROM trade_quality
  `;

  const metrics = result[0] || {};

  return {
    avgPnlToMfeRatio: Number(metrics.avg_pnl_to_mfe_ratio) || 0,
    avgPnlToMaeRatio: Number(metrics.avg_pnl_to_mae_ratio) || 0,
    avgMfe: Number(metrics.avg_mfe) || 0,
    avgMae: Number(metrics.avg_mae) || 0,
    goodExits: Number(metrics.good_exits) || 0,
    poorEntries: Number(metrics.poor_entries) || 0,
    avgWinTime: Number(metrics.avg_win_time) || 0,
    avgLossTime: Number(metrics.avg_loss_time) || 0,
  };
}

/**
 * Helper function to build filter conditions for raw SQL
 */
function buildFilterConditions(filters?: Partial<{
  dateFrom: Date;
  dateTo: Date;
  symbol: string;
  side: 'LONG' | 'SHORT';
}>): Prisma.Sql {
  if (!filters) return Prisma.empty;

  const conditions: Prisma.Sql[] = [];

  if (filters.dateFrom) {
    conditions.push(Prisma.sql`AND exit_date >= ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    conditions.push(Prisma.sql`AND exit_date <= ${filters.dateTo}`);
  }
  if (filters.symbol) {
    conditions.push(Prisma.sql`AND symbol = ${filters.symbol}`);
  }
  if (filters.side) {
    conditions.push(Prisma.sql`AND side = ${filters.side}`);
  }

  return conditions.length > 0 ? Prisma.join(conditions, ' ') : Prisma.empty;
}

/**
 * Batch calculate all key metrics for dashboard
 * Optimized for single database round-trip
 */
export async function calculateDashboardMetrics(
  userId: string,
  filters?: Partial<{
    dateFrom: Date;
    dateTo: Date;
    symbol: string;
    side: 'LONG' | 'SHORT';
  }>
) {
  const filterConditions = buildFilterConditions(filters);
  
  const result = await prisma.$queryRaw<any[]>`
    WITH trade_metrics AS (
      SELECT 
        pnl::NUMERIC as pnl,
        exit_date,
        symbol,
        side,
        time_in_trade,
        quantity,
        CASE 
          WHEN pnl > 0 THEN 'win'
          WHEN pnl < 0 THEN 'loss'
          ELSE 'scratch'
        END as outcome
      FROM trades
      WHERE 
        user_id = ${userId}
        AND status = 'CLOSED'
        ${filterConditions}
    ),
    summary_stats AS (
      SELECT 
        COUNT(*) as total_trades,
        COUNT(DISTINCT DATE(exit_date)) as trading_days,
        COUNT(*) FILTER (WHERE outcome = 'win') as wins,
        COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
        SUM(pnl) as total_pnl,
        AVG(pnl) as avg_pnl,
        STDDEV(pnl) as pnl_stddev,
        MAX(pnl) as best_trade,
        MIN(pnl) as worst_trade,
        AVG(pnl) FILTER (WHERE outcome = 'win') as avg_win,
        AVG(pnl) FILTER (WHERE outcome = 'loss') as avg_loss,
        SUM(pnl) FILTER (WHERE outcome = 'win') as gross_profit,
        SUM(ABS(pnl)) FILTER (WHERE outcome = 'loss') as gross_loss,
        AVG(time_in_trade) as avg_hold_time,
        SUM(quantity) as total_volume
      FROM trade_metrics
    ),
    daily_stats AS (
      SELECT 
        AVG(daily_pnl) as avg_daily_pnl,
        STDDEV(daily_pnl) as daily_pnl_stddev,
        MAX(daily_pnl) as best_day,
        MIN(daily_pnl) as worst_day
      FROM (
        SELECT DATE(exit_date) as day, SUM(pnl) as daily_pnl
        FROM trade_metrics
        GROUP BY DATE(exit_date)
      ) daily
    )
    SELECT 
      s.*,
      d.*,
      CASE 
        WHEN s.losses > 0 THEN s.wins::FLOAT / s.losses
        ELSE s.wins
      END as win_loss_ratio,
      CASE 
        WHEN s.total_trades > 0 THEN s.wins::FLOAT / s.total_trades * 100
        ELSE 0
      END as win_rate,
      CASE 
        WHEN s.gross_loss > 0 THEN s.gross_profit / s.gross_loss
        ELSE s.gross_profit
      END as profit_factor,
      CASE 
        WHEN s.pnl_stddev > 0 AND s.trading_days > 1 
        THEN (s.avg_pnl * SQRT(252)) / (s.pnl_stddev * SQRT(252))
        ELSE 0
      END as sharpe_ratio,
      CASE 
        WHEN s.avg_loss != 0 AND s.total_trades > 0
        THEN ((s.wins::FLOAT / s.total_trades) * s.avg_win) + 
             ((s.losses::FLOAT / s.total_trades) * s.avg_loss)
        ELSE 0
      END as expectancy
    FROM summary_stats s, daily_stats d
  `;

  return result[0] || {};
}