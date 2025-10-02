import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { CacheService } from './cacheService';

export class AnalyticsService {
  private userId: string;
  private cacheService: CacheService;

  constructor(userId: string) {
    this.userId = userId;
    this.cacheService = new CacheService();
  }

  /**
   * Helper to safely access date filter values
   */
  private getDateFilterValue(dateFilter: unknown, property: 'gte' | 'lte'): string | Date | null {
    if (!dateFilter) return null;
    if (typeof dateFilter === 'string' || dateFilter instanceof Date) {
      return dateFilter;
    }
    if (typeof dateFilter === 'object' && property in dateFilter) {
      return (dateFilter as Record<string, unknown>)[property] as string | Date;
    }
    return null;
  }

  /**
   * Helper to safely access array filter values
   */
  private getArrayFilterValue(filter: unknown): string[] | null {
    if (!filter) return null;
    if (Array.isArray(filter)) {
      return filter;
    }
    if (typeof filter === 'object' && 'in' in filter) {
      return (filter as Record<string, unknown>).in as string[];
    }
    return null;
  }

  /**
   * Parse date range from various input formats
   */
  parseDateRange(
    dateRange?: { 
      start?: string; 
      end?: string; 
      preset?: '30d' | '60d' | '90d' | '1w' | '2w' | '1m' | '3m' | '6m' | 'last-year' | 'ytd' | 'yesterday' 
    },
    _timeZone: string = 'America/New_York'
  ): { start: Date; end: Date } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    if (dateRange?.start && dateRange?.end) {
      return {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      };
    }

    if (dateRange?.preset) {
      const preset = dateRange.preset;
      let start: Date;
      
      switch (preset) {
        case '1w':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '2w':
          start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        case '1m':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '60d':
          start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
        case '3m':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6m':
          start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case 'last-year':
          start = new Date(now.getFullYear() - 1, 0, 1);
          return { start, end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) };
        case 'ytd':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        case 'yesterday':
          start = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
          return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      return { start, end: endOfDay };
    }

    // Default to last 30 days
    return {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: endOfDay
    };
  }

  /**
   * Build Prisma where clause for filtering trades
   */
  buildWhereClause(
    dateRange: { start: Date; end: Date },
    filters?: {
      symbols?: string[];
      tags?: string[];
      side?: 'LONG' | 'SHORT';
    }
  ): Prisma.TradeWhereInput {
    const where: Prisma.TradeWhereInput = {
      userId: this.userId,
      isCalculated: true,
      status: 'CLOSED',
      date: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    };

    if (filters?.symbols && filters.symbols.length > 0) {
      where.symbol = { in: filters.symbols.map(s => s.toUpperCase()) };
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters?.side) {
      where.side = filters.side;
    }

    return where;
  }

  /**
   * Calculate distribution metrics (month, day, hour, duration)
   */
  async calculateDistributionMetrics(
    where: Prisma.TradeWhereInput,
    _timeZone: string = 'America/New_York'
  ) {
    const cacheKey = `distribution:${this.userId}:${JSON.stringify(where)}`;
    const cached = await this.cacheService.getTimeAggregation(this.userId, 'daily', cacheKey);
    
    if (cached) return cached;

    // Month of year distribution
    const monthlyDistribution = await prisma.$queryRaw<Array<{
      month: number;
      trades: bigint;
      pnl: number;
      win_rate: number;
    }>>`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `;

    // Day of week distribution  
    const dayOfWeekDistribution = await prisma.$queryRaw<Array<{
      day_num: number;
      day_name: string;
      trades: bigint;
      pnl: number;
      win_rate: number;
    }>>`
      SELECT 
        EXTRACT(DOW FROM date) as day_num,
        CASE EXTRACT(DOW FROM date)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY EXTRACT(DOW FROM date)
      ORDER BY day_num
    `;

    // Hour of day distribution
    const hourlyDistribution = await prisma.$queryRaw<Array<{
      hour: number;
      trades: bigint;
      pnl: number;
      win_rate: number;
    }>>`
      SELECT 
        EXTRACT(HOUR FROM "openTime") as hour,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND "openTime" IS NOT NULL
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY EXTRACT(HOUR FROM "openTime")
      ORDER BY hour
    `;

    // Duration brackets
    const durationDistribution = await prisma.$queryRaw<Array<{
      bracket: string;
      trades: bigint;
      pnl: number;
      avg_duration: number;
    }>>`
      SELECT 
        CASE 
          WHEN "timeInTrade" IS NULL THEN 'Unknown'
          WHEN "timeInTrade" < 300 THEN '< 5 min'
          WHEN "timeInTrade" < 900 THEN '5-15 min'
          WHEN "timeInTrade" < 1800 THEN '15-30 min'
          WHEN "timeInTrade" < 3600 THEN '30-60 min'
          WHEN "timeInTrade" < 14400 THEN '1-4 hours'
          WHEN "timeInTrade" < 86400 THEN '4-24 hours'
          ELSE '> 1 day'
        END as bracket,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND(AVG("timeInTrade"), 0) as avg_duration
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY 
        CASE 
          WHEN "timeInTrade" IS NULL THEN 'Unknown'
          WHEN "timeInTrade" < 300 THEN '< 5 min'
          WHEN "timeInTrade" < 900 THEN '5-15 min'
          WHEN "timeInTrade" < 1800 THEN '15-30 min'
          WHEN "timeInTrade" < 3600 THEN '30-60 min'
          WHEN "timeInTrade" < 14400 THEN '1-4 hours'
          WHEN "timeInTrade" < 86400 THEN '4-24 hours'
          ELSE '> 1 day'
        END
      ORDER BY 
        CASE bracket
          WHEN '< 5 min' THEN 1
          WHEN '5-15 min' THEN 2
          WHEN '15-30 min' THEN 3
          WHEN '30-60 min' THEN 4
          WHEN '1-4 hours' THEN 5
          WHEN '4-24 hours' THEN 6
          WHEN '> 1 day' THEN 7
          ELSE 8
        END
    `;

    // Intraday duration (only same-day trades)
    const intradayDurationDistribution = await prisma.$queryRaw<Array<{
      bracket: string;
      trades: bigint;
      pnl: number;
      avg_duration: number;
    }>>`
      SELECT 
        CASE 
          WHEN "timeInTrade" IS NULL THEN 'Unknown'
          WHEN "timeInTrade" < 60 THEN '< 1 min'
          WHEN "timeInTrade" < 300 THEN '1-5 min'
          WHEN "timeInTrade" < 900 THEN '5-15 min'
          WHEN "timeInTrade" < 1800 THEN '15-30 min'
          WHEN "timeInTrade" < 3600 THEN '30-60 min'
          WHEN "timeInTrade" < 7200 THEN '1-2 hours'
          ELSE '> 2 hours'
        END as bracket,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND(AVG("timeInTrade"), 0) as avg_duration
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND "holdingPeriod" = 'INTRADAY'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY 
        CASE 
          WHEN "timeInTrade" IS NULL THEN 'Unknown'
          WHEN "timeInTrade" < 60 THEN '< 1 min'
          WHEN "timeInTrade" < 300 THEN '1-5 min'
          WHEN "timeInTrade" < 900 THEN '5-15 min'
          WHEN "timeInTrade" < 1800 THEN '15-30 min'
          WHEN "timeInTrade" < 3600 THEN '30-60 min'
          WHEN "timeInTrade" < 7200 THEN '1-2 hours'
          ELSE '> 2 hours'
        END
      ORDER BY 
        CASE bracket
          WHEN '< 1 min' THEN 1
          WHEN '1-5 min' THEN 2
          WHEN '5-15 min' THEN 3
          WHEN '15-30 min' THEN 4
          WHEN '30-60 min' THEN 5
          WHEN '1-2 hours' THEN 6
          WHEN '> 2 hours' THEN 7
          ELSE 8
        END
    `;

    const result = {
      monthOfYear: monthlyDistribution.map(row => ({
        month: Number(row.month),
        trades: Number(row.trades),
        pnl: Number(row.pnl),
        winRate: Number(row.win_rate)
      })),
      dayOfWeek: dayOfWeekDistribution.map(row => ({
        day: row.day_name,
        trades: Number(row.trades),
        pnl: Number(row.pnl),
        winRate: Number(row.win_rate)
      })),
      hourOfDay: hourlyDistribution.map(row => ({
        hour: Number(row.hour),
        trades: Number(row.trades),
        pnl: Number(row.pnl),
        winRate: Number(row.win_rate)
      })),
      duration: durationDistribution.map(row => ({
        bracket: row.bracket,
        trades: Number(row.trades),
        pnl: Number(row.pnl),
        avgDuration: Number(row.avg_duration)
      })),
      intradayDuration: intradayDurationDistribution.map(row => ({
        bracket: row.bracket,
        trades: Number(row.trades),
        pnl: Number(row.pnl),
        avgDuration: Number(row.avg_duration)
      }))
    };

    // Cache for 30 minutes
    await this.cacheService.setTimeAggregation(this.userId, 'daily', cacheKey, result);
    return result;
  }

  /**
   * Calculate volume metrics with share counts (not dollar values)
   */
  async calculateVolumeMetrics(
    where: Prisma.TradeWhereInput,
    dateRange: { start: Date; end: Date }
  ) {
    const intervalType = this.determineOptimalInterval(dateRange);
    
    // Build period selection SQL based on interval type
    let periodSelector: Prisma.Sql;
    switch (intervalType) {
      case 'daily':
        periodSelector = Prisma.sql`date::date::text`;
        break;
      case 'weekly':
        periodSelector = Prisma.sql`TO_CHAR(DATE_TRUNC('week', date), 'YYYY-"W"WW')`;
        break;
      case 'monthly':
        periodSelector = Prisma.sql`TO_CHAR(date, 'YYYY-MM')`;
        break;
      case 'yearly':
        periodSelector = Prisma.sql`EXTRACT(YEAR FROM date)::text`;
        break;
      default:
        periodSelector = Prisma.sql`TO_CHAR(date, 'YYYY-MM')`;
    }
    
    // Volume aggregation with dynamic time intervals and normalization
    const volumeQuery = await prisma.$queryRaw<Array<{
      period: string;
      total_shares: bigint;
      trading_days: bigint;
      normalized_daily_volume: number;
      trade_count: bigint;
      avg_daily_pnl: number;
      win_rate: number;
    }>>`
      SELECT 
        ${periodSelector} as period,
        SUM(COALESCE(quantity, 0)) as total_shares,
        COUNT(DISTINCT date::date) as trading_days,
        CASE 
          WHEN COUNT(DISTINCT date::date) > 0 
          THEN ROUND(SUM(COALESCE(quantity, 0))::numeric / COUNT(DISTINCT date::date), 2)
          ELSE 0 
        END as normalized_daily_volume,
        COUNT(*) as trade_count,
        ROUND(AVG(pnl), 2) as avg_daily_pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND quantity IS NOT NULL
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY ${periodSelector}
      ORDER BY period
    `;
    
    return {
      intervalType,
      data: volumeQuery.map(row => ({
        period: String(row.period),
        shares: Number(row.total_shares),
        tradingDays: Number(row.trading_days),
        normalizedDailyVolume: Number(row.normalized_daily_volume),
        trades: Number(row.trade_count),
        avgDailyPnl: Number(row.avg_daily_pnl),
        winRate: Number(row.win_rate)
      }))
    };
  }

  /**
   * Calculate averaged daily P&L (total P&L / days in period)
   */
  async calculateAveragedDailyPnl(
    where: Prisma.TradeWhereInput,
    dateRange: { start: Date; end: Date }
  ): Promise<number> {
    const result = await prisma.$queryRaw<Array<{ total_pnl: number }>>`
      SELECT SUM(pnl) as total_pnl
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
    `;

    const totalPnl = Number(result[0]?.total_pnl || 0);
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff > 0 ? totalPnl / daysDiff : 0;
  }

  /**
   * Determine optimal time interval based on date range
   */
  private determineOptimalInterval(dateRange: { start: Date; end: Date }): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return 'daily';       // ≤1 week: daily intervals
    if (daysDiff <= 30) return 'weekly';     // ≤1 month: weekly intervals  
    if (daysDiff <= 365) return 'monthly';   // ≤1 year: monthly intervals (default)
    return 'yearly';                         // >1 year: yearly intervals
  }

  /**
   * Calculate time interval data with consistent bucketing
   */
  async calculateTimeIntervalData(
    where: Prisma.TradeWhereInput, 
    dateRange: { start: Date; end: Date }
  ) {
    const intervalType = this.determineOptimalInterval(dateRange);
    
    const intervalData = await this.calculateVolumeMetrics(where, dateRange);
    
    return {
      intervalType,
      intervals: intervalData.data,
      averagedDailyPnl: await this.calculateAveragedDailyPnl(where, dateRange)
    };
  }

  /**
   * Calculate performance metrics over time
   */
  async calculatePerformanceMetrics(
    where: Prisma.TradeWhereInput,
    _timeZone: string = 'America/New_York'
  ) {
    // Daily performance
    const dailyPerformance = await prisma.$queryRaw<Array<{
      date: Date;
      pnl: number;
      win_rate: number;
      trades: bigint;
      cumulative_pnl: number;
    }>>`
      SELECT 
        date::date as date,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
        COUNT(*) as trades,
        SUM(SUM(pnl)) OVER (ORDER BY date::date) as cumulative_pnl
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY date::date
      ORDER BY date::date
    `;

    // Weekly performance
    const weeklyPerformance = await prisma.$queryRaw<Array<{
      week_start: Date;
      period: string;
      pnl: number;
      win_rate: number;
      trades: bigint;
    }>>`
      SELECT 
        DATE_TRUNC('week', date) as week_start,
        TO_CHAR(DATE_TRUNC('week', date), 'YYYY-"W"WW') as period,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
        COUNT(*) as trades
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY week_start
    `;

    // Monthly performance
    const monthlyPerformance = await prisma.$queryRaw<Array<{
      month_start: Date;
      period: string;
      pnl: number;
      win_rate: number;
      trades: bigint;
      sharpe_ratio: number;
    }>>`
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', date) as month_start,
          TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as period,
          SUM(pnl) as pnl,
          ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
          COUNT(*) as trades,
          STDDEV(pnl) as pnl_stddev,
          AVG(pnl) as avg_pnl
        FROM trades
        WHERE "userId" = ${this.userId}
          AND "isCalculated" = true
          AND status = 'CLOSED'
          AND date >= ${this.getDateFilterValue(where.date, 'gte')}
          AND date <= ${this.getDateFilterValue(where.date, 'lte')}
          ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
          ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
        GROUP BY DATE_TRUNC('month', date)
      )
      SELECT 
        *,
        CASE 
          WHEN pnl_stddev > 0 THEN ROUND((avg_pnl / pnl_stddev), 3)
          ELSE 0 
        END as sharpe_ratio
      FROM monthly_data
      ORDER BY month_start
    `;

    // Hourly performance averages
    const hourlyPerformance = await prisma.$queryRaw<Array<{
      hour: number;
      avg_pnl: number;
      win_rate: number;
      trades: bigint;
    }>>`
      SELECT 
        EXTRACT(HOUR FROM "openTime") as hour,
        ROUND(AVG(pnl), 2) as avg_pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
        COUNT(*) as trades
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND "openTime" IS NOT NULL
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY EXTRACT(HOUR FROM "openTime")
      ORDER BY hour
    `;

    return {
      byDay: dailyPerformance.map(row => ({
        date: row.date.toISOString().split('T')[0],
        pnl: Number(row.pnl),
        winRate: Number(row.win_rate),
        trades: Number(row.trades),
        cumulativePnl: Number(row.cumulative_pnl)
      })),
      byWeek: weeklyPerformance.map(row => ({
        period: row.period,
        pnl: Number(row.pnl),
        winRate: Number(row.win_rate),
        trades: Number(row.trades)
      })),
      byMonth: monthlyPerformance.map(row => ({
        period: row.period,
        pnl: Number(row.pnl),
        winRate: Number(row.win_rate),
        trades: Number(row.trades),
        sharpeRatio: Number(row.sharpe_ratio)
      })),
      byHour: hourlyPerformance.map(row => ({
        hour: Number(row.hour),
        avgPnl: Number(row.avg_pnl),
        winRate: Number(row.win_rate),
        trades: Number(row.trades)
      }))
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  async calculateStatistics(where: Prisma.TradeWhereInput) {
    const trades = await prisma.trade.findMany({
      where,
      select: {
        pnl: true,
        quantity: true,
        commission: true,
        fees: true,
        date: true
      },
      orderBy: { date: 'asc' }
    });

    if (trades.length === 0) {
      return this.getEmptyStatistics();
    }

    const pnls = trades.map(t => Number(t.pnl));
    const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const winningTrades = pnls.filter(pnl => pnl > 0);
    const losingTrades = pnls.filter(pnl => pnl < 0);
    
    const winRate = (winningTrades.length / trades.length) * 100;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, pnl) => sum + pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, pnl) => sum + pnl, 0) / losingTrades.length : 0;
    
    const grossProfit = winningTrades.reduce((sum, pnl) => sum + pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;

    // Calculate consecutive streaks
    const { maxWins, maxLosses } = this.calculateConsecutiveStreaks(pnls);

    // Calculate Sharpe ratio
    const avgReturn = totalPnl / trades.length;
    const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgReturn, 2), 0) / trades.length;
    const sharpeRatio = Math.sqrt(variance) > 0 ? avgReturn / Math.sqrt(variance) : 0;

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(pnls);

    // Daily aggregations for additional metrics
    const tradesForGrouping = trades.map(t => ({ pnl: Number(t.pnl), date: t.date }));
    const dailyGroups = this.groupByDay(tradesForGrouping);
    const dailyPnls = Object.values(dailyGroups).map(dayTrades => 
      dayTrades.reduce((sum, trade) => sum + Number(trade.pnl), 0)
    );
    const avgDailyPnl = dailyPnls.reduce((sum, pnl) => sum + pnl, 0) / Math.max(dailyPnls.length, 1);

    // Time-based best/worst analysis
    const timeBasedMetrics = await this.calculateTimeBasedMetrics(where);

    return {
      overall: {
        totalPnl,
        avgDailyPnl,
        winRate,
        avgWin,
        avgLoss,
        maxConsecutiveWins: maxWins,
        maxConsecutiveLosses: maxLosses,
        profitFactor,
        sharpeRatio,
        maxDrawdown,
        totalVolume: trades.reduce((sum, t) => sum + (t.quantity || 0), 0),
        avgPositionSize: trades.reduce((sum, t) => sum + (t.quantity || 0), 0) / trades.length,
        totalCommissions: trades.reduce((sum, t) => sum + Number(t.commission || 0), 0),
        totalFees: trades.reduce((sum, t) => sum + Number(t.fees || 0), 0)
      },
      timeBasedMetrics
    };
  }

  /**
   * Calculate time-based analysis metrics
   */
  async calculateTimeAnalysis(
    where: Prisma.TradeWhereInput,
    _timeZone: string = 'America/New_York'
  ) {
    // Market session analysis
    const sessionAnalysis = await prisma.$queryRaw<Array<{
      market_session: string;
      trades: bigint;
      pnl: number;
      win_rate: number;
    }>>`
      SELECT 
        "marketSession" as market_session,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY "marketSession"
    `;

    // Holding period analysis
    const holdingPeriodAnalysis = await prisma.$queryRaw<Array<{
      holding_period: string;
      trades: bigint;
      pnl: number;
      win_rate: number;
      avg_duration: number;
    }>>`
      SELECT 
        "holdingPeriod" as holding_period,
        COUNT(*) as trades,
        SUM(pnl) as pnl,
        ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
        ROUND(AVG("timeInTrade"), 0) as avg_duration
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
        ${where.symbol ? Prisma.sql`AND symbol = ANY(${this.getArrayFilterValue(where.symbol)})` : Prisma.empty}
        ${where.side ? Prisma.sql`AND side = ${where.side}` : Prisma.empty}
      GROUP BY "holdingPeriod"
    `;

    // Convert to response format
    const sessionMap = new Map(sessionAnalysis.map(s => [s.market_session, s]));
    const holdingMap = new Map(holdingPeriodAnalysis.map(h => [h.holding_period, h]));

    return {
      sessionAnalysis: {
        preMarket: this.formatSessionData(sessionMap.get('PRE_MARKET')),
        regular: this.formatSessionData(sessionMap.get('REGULAR')),
        afterHours: this.formatSessionData(sessionMap.get('AFTER_HOURS'))
      },
      holdingPeriodAnalysis: {
        scalp: this.formatHoldingPeriodData(holdingMap.get('SCALP')),
        intraday: this.formatHoldingPeriodData(holdingMap.get('INTRADAY')),
        swing: this.formatHoldingPeriodData(holdingMap.get('SWING')),
        position: this.formatHoldingPeriodData(holdingMap.get('POSITION')),
        longTerm: this.formatHoldingPeriodData(holdingMap.get('LONG_TERM'))
      }
    };
  }

  private async calculateTimeBasedMetrics(where: Prisma.TradeWhereInput) {
    // Best/worst hours, days, months
    const hourMetrics = await prisma.$queryRaw<Array<{
      hour: number;
      avg_pnl: number;
    }>>`
      SELECT 
        EXTRACT(HOUR FROM "openTime") as hour,
        ROUND(AVG(pnl), 2) as avg_pnl
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND "openTime" IS NOT NULL
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
      GROUP BY EXTRACT(HOUR FROM "openTime")
      ORDER BY avg_pnl DESC
    `;

    const dayMetrics = await prisma.$queryRaw<Array<{
      day_num: number;
      day_name: string;
      avg_pnl: number;
    }>>`
      SELECT 
        EXTRACT(DOW FROM date) as day_num,
        CASE EXTRACT(DOW FROM date)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        ROUND(AVG(pnl), 2) as avg_pnl
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
      GROUP BY EXTRACT(DOW FROM date)
      ORDER BY avg_pnl DESC
    `;

    const monthMetrics = await prisma.$queryRaw<Array<{
      month: number;
      avg_pnl: number;
    }>>`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        ROUND(AVG(pnl), 2) as avg_pnl
      FROM trades
      WHERE "userId" = ${this.userId}
        AND "isCalculated" = true
        AND status = 'CLOSED'
        AND date >= ${this.getDateFilterValue(where.date, 'gte')}
        AND date <= ${this.getDateFilterValue(where.date, 'lte')}
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY avg_pnl DESC
    `;

    return {
      bestHour: hourMetrics[0] ? { hour: Number(hourMetrics[0].hour), avgPnl: Number(hourMetrics[0].avg_pnl) } : { hour: 0, avgPnl: 0 },
      worstHour: hourMetrics[hourMetrics.length - 1] ? { hour: Number(hourMetrics[hourMetrics.length - 1].hour), avgPnl: Number(hourMetrics[hourMetrics.length - 1].avg_pnl) } : { hour: 0, avgPnl: 0 },
      bestDayOfWeek: dayMetrics[0] ? { day: dayMetrics[0].day_name, avgPnl: Number(dayMetrics[0].avg_pnl) } : { day: 'Monday', avgPnl: 0 },
      worstDayOfWeek: dayMetrics[dayMetrics.length - 1] ? { day: dayMetrics[dayMetrics.length - 1].day_name, avgPnl: Number(dayMetrics[dayMetrics.length - 1].avg_pnl) } : { day: 'Monday', avgPnl: 0 },
      bestMonth: monthMetrics[0] ? { month: Number(monthMetrics[0].month), avgPnl: Number(monthMetrics[0].avg_pnl) } : { month: 1, avgPnl: 0 },
      worstMonth: monthMetrics[monthMetrics.length - 1] ? { month: Number(monthMetrics[monthMetrics.length - 1].month), avgPnl: Number(monthMetrics[monthMetrics.length - 1].avg_pnl) } : { month: 1, avgPnl: 0 }
    };
  }

  private formatSessionData(data?: { trades: bigint; pnl: number; win_rate: number }) {
    return {
      trades: data ? Number(data.trades) : 0,
      pnl: data ? Number(data.pnl) : 0,
      winRate: data ? Number(data.win_rate) : 0
    };
  }

  private formatHoldingPeriodData(data?: { trades: bigint; pnl: number; win_rate: number; avg_duration: number }) {
    return {
      trades: data ? Number(data.trades) : 0,
      pnl: data ? Number(data.pnl) : 0,
      winRate: data ? Number(data.win_rate) : 0,
      avgDuration: data ? Number(data.avg_duration) : 0
    };
  }

  private calculateConsecutiveStreaks(pnls: number[]): { maxWins: number; maxLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    for (const pnl of pnls) {
      if (pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else if (pnl < 0) {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
    }

    return { maxWins, maxLosses };
  }

  private calculateMaxDrawdown(pnls: number[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;

    for (const pnl of pnls) {
      cumulative += pnl;
      peak = Math.max(peak, cumulative);
      const drawdown = peak - cumulative;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private groupByDay(trades: Array<{ pnl: number; date: Date }>): Record<string, Array<{ pnl: number; date: Date }>> {
    const groups: Record<string, Array<{ pnl: number; date: Date }>> = {};
    
    for (const trade of trades) {
      const dateKey = trade.date.toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(trade);
    }
    
    return groups;
  }

  private getEmptyStatistics() {
    return {
      overall: {
        totalPnl: 0,
        avgDailyPnl: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        totalVolume: 0,
        avgPositionSize: 0,
        totalCommissions: 0,
        totalFees: 0
      },
      timeBasedMetrics: {
        bestHour: { hour: 0, avgPnl: 0 },
        worstHour: { hour: 0, avgPnl: 0 },
        bestDayOfWeek: { day: 'Monday', avgPnl: 0 },
        worstDayOfWeek: { day: 'Monday', avgPnl: 0 },
        bestMonth: { month: 1, avgPnl: 0 },
        worstMonth: { month: 1, avgPnl: 0 }
      }
    };
  }
}