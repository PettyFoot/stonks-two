import { Trade } from '@prisma/client';

// Time bucket definitions
export type TimeBucket = '< 1min' | '1-5min' | '5-15min' | '15-30min' | '30-60min' | '1-2hr' | '2-4hr' | '4hr+' | 'overnight';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type HourOfDay = number; // 0-23
export type MonthOfYear = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

// Helper to convert seconds to time bucket
export function getTimeBucket(seconds: number | null | undefined): TimeBucket {
  if (!seconds || seconds < 0) return '< 1min';
  
  const minutes = seconds / 60;
  const hours = minutes / 60;
  
  if (minutes < 1) return '< 1min';
  if (minutes < 5) return '1-5min';
  if (minutes < 15) return '5-15min';
  if (minutes < 30) return '15-30min';
  if (minutes < 60) return '30-60min';
  if (hours < 2) return '1-2hr';
  if (hours < 4) return '2-4hr';
  if (hours < 24) return '4hr+';
  return 'overnight';
}

// Helper to get day of week from date
export function getDayOfWeek(date: Date | string): DayOfWeek {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

// Helper to get hour of day from date
export function getHourOfDay(date: Date | string): HourOfDay {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getHours();
}

// Helper to get month from date
export function getMonthOfYear(date: Date | string): MonthOfYear {
  const d = typeof date === 'string' ? new Date(date) : date;
  const months: MonthOfYear[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()];
}

// Format time duration for display
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// Aggregate trades by day of week
export function aggregateByDayOfWeek(trades: any[]) {
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const distribution: Record<DayOfWeek, number> = {} as any;
  const performance: Record<DayOfWeek, number> = {} as any;
  
  // Initialize
  days.forEach(day => {
    distribution[day] = 0;
    performance[day] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const day = getDayOfWeek(trade.entryDate || trade.date);
    if (days.includes(day)) {
      distribution[day]++;
      performance[day] += Number(trade.pnl || 0);
    }
  });
  
  return {
    distribution: days.map(day => ({
      date: day,
      value: distribution[day]
    })),
    performance: days.map(day => ({
      date: day,
      value: performance[day]
    }))
  };
}

// Aggregate trades by hour of day (24-hour support for stocks that trade around the clock)
export function aggregateByHourOfDay(trades: any[]) {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 (24-hour trading)
  const distribution: Record<number, number> = {};
  const performance: Record<number, number> = {};
  
  // Initialize all hours
  hours.forEach(hour => {
    distribution[hour] = 0;
    performance[hour] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const hour = getHourOfDay(trade.entryDate || trade.date);
    distribution[hour]++;
    performance[hour] += Number(trade.pnl || 0);
  });
  
  return {
    distribution: hours.map(hour => ({
      date: `${hour.toString().padStart(2, '0')}:00`,
      value: distribution[hour]
    })),
    performance: hours.map(hour => ({
      date: `${hour.toString().padStart(2, '0')}:00`,
      value: performance[hour]
    }))
  };
}

// Aggregate trades by month of year
export function aggregateByMonthOfYear(trades: any[]) {
  const months: MonthOfYear[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const distribution: Record<MonthOfYear, number> = {} as any;
  const performance: Record<MonthOfYear, number> = {} as any;
  
  // Initialize
  months.forEach(month => {
    distribution[month] = 0;
    performance[month] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const month = getMonthOfYear(trade.entryDate || trade.date);
    distribution[month]++;
    performance[month] += Number(trade.pnl || 0);
  });
  
  return {
    distribution: months.map(month => ({
      date: month,
      value: distribution[month]
    })),
    performance: months.map(month => ({
      date: month,
      value: performance[month]
    }))
  };
}

// Aggregate trades by simple duration (Intraday vs Multiday)
export function aggregateBySimpleDuration(trades: any[]) {
  const distribution = { Intraday: 0, Multiday: 0 };
  const performance = { Intraday: 0, Multiday: 0 };
  
  trades.forEach(trade => {
    const seconds = trade.timeInTrade || 0;
    const category = seconds < 86400 ? 'Intraday' : 'Multiday'; // 86400 seconds = 24 hours
    distribution[category]++;
    performance[category] += Number(trade.pnl || 0);
  });
  
  return {
    distribution: [
      { date: 'Intraday', value: distribution.Intraday },
      { date: 'Multiday', value: distribution.Multiday }
    ],
    performance: [
      { date: 'Intraday', value: performance.Intraday },
      { date: 'Multiday', value: performance.Multiday }
    ]
  };
}

// New intraday time bucket type
export type IntradayBucket = '<1min' | '1-2min' | '2-5min' | '5-10min' | '10-20min' | '20-40min' | '40-60min' | '60-120min' | '120-240min' | '>240min';

// Helper to get intraday bucket
export function getIntradayBucket(seconds: number): IntradayBucket {
  const minutes = seconds / 60;
  if (minutes < 1) return '<1min';
  if (minutes < 2) return '1-2min';
  if (minutes < 5) return '2-5min';
  if (minutes < 10) return '5-10min';
  if (minutes < 20) return '10-20min';
  if (minutes < 40) return '20-40min';
  if (minutes < 60) return '40-60min';
  if (minutes < 120) return '60-120min';
  if (minutes < 240) return '120-240min';
  return '>240min';
}

// Aggregate trades by intraday duration with new buckets
export function aggregateByIntradayDuration(trades: any[]) {
  const buckets: IntradayBucket[] = ['<1min', '1-2min', '2-5min', '5-10min', '10-20min', '20-40min', '40-60min', '60-120min', '120-240min', '>240min'];
  const intradayTrades = trades.filter(t => (t.timeInTrade || 0) < 86400); // Only trades < 24 hours
  
  const distribution: Record<IntradayBucket, number> = {} as any;
  const performance: Record<IntradayBucket, number> = {} as any;
  
  // Initialize
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  intradayTrades.forEach(trade => {
    const bucket = getIntradayBucket(trade.timeInTrade || 0);
    distribution[bucket]++;
    performance[bucket] += Number(trade.pnl || 0);
  });
  
  return {
    distribution: buckets.map(bucket => ({
      date: bucket,
      value: distribution[bucket]
    })),
    performance: buckets.map(bucket => ({
      date: bucket,
      value: performance[bucket]
    }))
  };
}

// Keep original aggregateByDuration for backwards compatibility if needed
export function aggregateByDuration(trades: any[]) {
  const buckets: TimeBucket[] = ['< 1min', '1-5min', '5-15min', '15-30min', '30-60min', '1-2hr', '2-4hr', '4hr+'];
  const distribution: Record<TimeBucket, number> = {} as any;
  const performance: Record<TimeBucket, number> = {} as any;
  
  // Initialize
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const bucket = getTimeBucket(trade.timeInTrade);
    if (buckets.includes(bucket)) {
      distribution[bucket]++;
      performance[bucket] += Number(trade.pnl || 0);
    }
  });
  
  return {
    distribution: buckets.map(bucket => ({
      date: bucket,
      value: distribution[bucket]
    })),
    performance: buckets.map(bucket => ({
      date: bucket,
      value: performance[bucket]
    }))
  };
}

// Calculate consecutive wins/losses
export function calculateConsecutiveStreaks(trades: any[]) {
  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.exitDate || a.date).getTime() - new Date(b.exitDate || b.date).getTime()
  );
  
  sortedTrades.forEach(trade => {
    const pnl = Number(trade.pnl || 0);
    
    if (pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxWins = Math.max(maxWins, currentWins);
    } else if (pnl < 0) {
      currentLosses++;
      currentWins = 0;
      maxLosses = Math.max(maxLosses, currentLosses);
    }
  });
  
  return { maxConsecutiveWins: maxWins, maxConsecutiveLosses: maxLosses };
}

// Calculate standard deviation of P&L
export function calculatePnlStandardDeviation(trades: any[]): number {
  if (trades.length === 0) return 0;
  
  const pnls = trades.map(t => Number(t.pnl || 0));
  const mean = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
  const squaredDiffs = pnls.map(pnl => Math.pow(pnl - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / pnls.length;
  
  return Math.sqrt(variance);
}

// Calculate profit factor
export function calculateProfitFactor(trades: any[]): number {
  const gains = trades
    .filter(t => Number(t.pnl || 0) > 0)
    .reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    
  const losses = Math.abs(trades
    .filter(t => Number(t.pnl || 0) < 0)
    .reduce((sum, t) => sum + Number(t.pnl || 0), 0));
  
  return losses === 0 ? gains > 0 ? Infinity : 0 : gains / losses;
}

// Price bucket type
export type PriceBucket = '<1' | '1-2' | '2-5' | '5-10' | '10-20' | '20-50' | '50-100' | '100+';

// Helper to get price bucket
export function getPriceBucket(price: number): PriceBucket {
  if (price < 1) return '<1';
  if (price < 2) return '1-2';
  if (price < 5) return '2-5';
  if (price < 10) return '5-10';
  if (price < 20) return '10-20';
  if (price < 50) return '20-50';
  if (price < 100) return '50-100';
  return '100+';
}

// Aggregate trades by price
export function aggregateByPrice(trades: any[]) {
  const buckets: PriceBucket[] = ['<1', '1-2', '2-5', '5-10', '10-20', '20-50', '50-100', '100+'];
  const distribution: Record<PriceBucket, number> = {} as any;
  const performance: Record<PriceBucket, number> = {} as any;
  
  // Initialize all buckets to ensure they all appear even if empty
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    // Use avgEntryPrice if available, otherwise fall back to entryPrice
    const price = Number(trade.avgEntryPrice || trade.entryPrice || 0);
    if (price > 0) {
      const bucket = getPriceBucket(price);
      distribution[bucket]++;
      performance[bucket] += Number(trade.pnl || 0);
    }
  });
  
  return {
    distribution: buckets.map(bucket => ({
      date: bucket,
      value: distribution[bucket]
    })),
    performance: buckets.map(bucket => ({
      date: bucket,
      value: performance[bucket]
    }))
  };
}

// Volume bucket type
export type VolumeBucket = '<50' | '50-100' | '100-200' | '200-500' | '500-1000' | '1000-2000' | '2000-5000' | '>5000';

// Helper to get volume bucket
export function getVolumeBucket(volume: number): VolumeBucket {
  if (volume < 50) return '<50';
  if (volume < 100) return '50-100';
  if (volume < 200) return '100-200';
  if (volume < 500) return '200-500';
  if (volume < 1000) return '500-1000';
  if (volume < 2000) return '1000-2000';
  if (volume < 5000) return '2000-5000';
  return '>5000';
}

// Aggregate trades by volume
export function aggregateByVolume(trades: any[]) {
  const buckets: VolumeBucket[] = ['<50', '50-100', '100-200', '200-500', '500-1000', '1000-2000', '2000-5000', '>5000'];
  const distribution: Record<VolumeBucket, number> = {} as any;
  const performance: Record<VolumeBucket, number> = {} as any;
  
  // Initialize all buckets to ensure they all appear even if empty
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const volume = Number(trade.quantity || 0);
    const bucket = getVolumeBucket(volume);
    distribution[bucket]++;
    performance[bucket] += Number(trade.pnl || 0);
  });
  
  return {
    distribution: buckets.map(bucket => ({
      date: bucket,
      value: distribution[bucket]
    })),
    performance: buckets.map(bucket => ({
      date: bucket,
      value: performance[bucket]
    }))
  };
}

/* 
 * Database Engineer Review Point:
 * These calculations can be optimized with database aggregations:
 * 
 * // Day of week aggregation
 * const dayOfWeekStats = await prisma.$queryRaw`
 *   SELECT 
 *     EXTRACT(DOW FROM entry_date) as day_of_week,
 *     COUNT(*) as trade_count,
 *     SUM(pnl) as total_pnl
 *   FROM trades
 *   WHERE user_id = ${userId}
 *     AND status = 'CLOSED'
 *   GROUP BY EXTRACT(DOW FROM entry_date)
 *   ORDER BY day_of_week
 * `;
 * 
 * // Hour of day aggregation
 * const hourStats = await prisma.$queryRaw`
 *   SELECT 
 *     EXTRACT(HOUR FROM entry_date) as hour_of_day,
 *     COUNT(*) as trade_count,
 *     SUM(pnl) as total_pnl
 *   FROM trades
 *   WHERE user_id = ${userId}
 *     AND status = 'CLOSED'
 *     AND EXTRACT(HOUR FROM entry_date) BETWEEN 7 AND 20
 *   GROUP BY EXTRACT(HOUR FROM entry_date)
 *   ORDER BY hour_of_day
 * `;
 */