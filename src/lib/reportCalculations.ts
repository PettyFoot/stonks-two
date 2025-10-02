
// Trade interface for type safety
interface TradeData {
  pnl?: string | number | null;
  timeInTrade?: number | null;
  entryDate?: string | Date | null;
  exitDate?: string | Date | null;
  date?: string | Date | null;
  avgEntryPrice?: string | number | null;
  entryPrice?: string | number | null;
  quantity?: string | number | null;
  holdingPeriod?: string | null;
}

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
  
  const days = Math.floor(seconds / 86400); // 24 * 60 * 60
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  // If more than 24 hours, show days/hours/minutes
  if (days > 0) {
    if (hours > 0 && minutes > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${days}d ${hours}h`;
    } else {
      return `${days}d ${minutes}m`;
    }
  }
  
  // If more than 1 hour but less than 24 hours, show hours/minutes
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  // If less than 1 hour, show minutes/seconds
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  
  return `${secs}s`;
}

// Aggregate trades by day of week
export function aggregateByDayOfWeek(trades: TradeData[]) {
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const distribution: Record<DayOfWeek, number> = {} as Record<DayOfWeek, number>;
  const performance: Record<DayOfWeek, number> = {} as Record<DayOfWeek, number>;
  
  // Initialize
  days.forEach(day => {
    distribution[day] = 0;
    performance[day] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const date = trade.entryDate || trade.date;
    if (date) {
      const day = getDayOfWeek(date);
      if (days.includes(day)) {
        distribution[day] += Number(trade.quantity || 0);
        performance[day] += Number(trade.pnl || 0);
      }
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
export function aggregateByHourOfDay(trades: TradeData[]) {
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
    const date = trade.entryDate || trade.date;
    if (date) {
      const hour = getHourOfDay(date);
      distribution[hour] += Number(trade.quantity || 0);
      performance[hour] += Number(trade.pnl || 0);
    }
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
export function aggregateByMonthOfYear(trades: TradeData[]) {
  const months: MonthOfYear[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const distribution: Record<MonthOfYear, number> = {} as Record<MonthOfYear, number>;
  const performance: Record<MonthOfYear, number> = {} as Record<MonthOfYear, number>;
  
  // Initialize
  months.forEach(month => {
    distribution[month] = 0;
    performance[month] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const date = trade.entryDate || trade.date;
    if (date) {
      const month = getMonthOfYear(date);
      distribution[month] += Number(trade.quantity || 0);
      performance[month] += Number(trade.pnl || 0);
    }
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

// Aggregate trades by simple duration (Intraday vs Swing) using holdingPeriod field
export function aggregateBySimpleDuration(trades: TradeData[]) {
  const distribution = { Intraday: 0, Swing: 0 };
  const performance = { Intraday: 0, Swing: 0 };
  
  trades.forEach(trade => {
    const holdingPeriod = trade.holdingPeriod;
    let category: 'Intraday' | 'Swing';
    
    // Group by holdingPeriod: SCALP and INTRADAY → Intraday, SWING/POSITION/LONG_TERM → Swing  
    if (holdingPeriod === 'SCALP' || holdingPeriod === 'INTRADAY') {
      category = 'Intraday';
    } else if (holdingPeriod === 'SWING' || holdingPeriod === 'POSITION' || holdingPeriod === 'LONG_TERM') {
      category = 'Swing';
    } else {
      // Fallback to timeInTrade calculation for trades without holdingPeriod
      const seconds = trade.timeInTrade || 0;
      category = seconds < 86400 ? 'Intraday' : 'Swing'; // 86400 seconds = 24 hours
    }
    
    distribution[category] += Number(trade.quantity || 0);
    performance[category] += Number(trade.pnl || 0);
  });
  
  return {
    distribution: [
      { date: 'Intraday', value: distribution.Intraday },
      { date: 'Swing', value: distribution.Swing }
    ],
    performance: [
      { date: 'Intraday', value: performance.Intraday },
      { date: 'Swing', value: performance.Swing }
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
export function aggregateByIntradayDuration(trades: TradeData[]) {
  const buckets: IntradayBucket[] = ['<1min', '1-2min', '2-5min', '5-10min', '10-20min', '20-40min', '40-60min', '60-120min', '120-240min', '>240min'];
  const intradayTrades = trades.filter(t => (t.timeInTrade || 0) < 86400); // Only trades < 24 hours
  
  const distribution: Record<IntradayBucket, number> = {} as Record<IntradayBucket, number>;
  const performance: Record<IntradayBucket, number> = {} as Record<IntradayBucket, number>;
  
  // Initialize
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  intradayTrades.forEach(trade => {
    const bucket = getIntradayBucket(trade.timeInTrade || 0);
    distribution[bucket] += Number(trade.quantity || 0);
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
export function aggregateByDuration(trades: TradeData[]) {
  const buckets: TimeBucket[] = ['< 1min', '1-5min', '5-15min', '15-30min', '30-60min', '1-2hr', '2-4hr', '4hr+'];
  const distribution: Record<TimeBucket, number> = {} as Record<TimeBucket, number>;
  const performance: Record<TimeBucket, number> = {} as Record<TimeBucket, number>;
  
  // Initialize
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const bucket = getTimeBucket(trade.timeInTrade);
    if (buckets.includes(bucket)) {
      distribution[bucket] += Number(trade.quantity || 0);
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
export function calculateConsecutiveStreaks(trades: TradeData[]) {
  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = a.exitDate || a.date;
    const dateB = b.exitDate || b.date;
    if (!dateA || !dateB) return 0;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  
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
export function calculatePnlStandardDeviation(trades: TradeData[]): number {
  if (trades.length === 0) return 0;
  
  const pnls = trades.map(t => Number(t.pnl || 0));
  const mean = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length;
  const squaredDiffs = pnls.map(pnl => Math.pow(pnl - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / pnls.length;
  
  return Math.sqrt(variance);
}

// Calculate profit factor
export function calculateProfitFactor(trades: TradeData[]): number {
  const gains = trades
    .filter(t => Number(t.pnl || 0) > 0)
    .reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  const losses = Math.abs(trades
    .filter(t => Number(t.pnl || 0) < 0)
    .reduce((sum, t) => sum + Number(t.pnl || 0), 0));

  return losses === 0 ? gains : gains / losses;
}

// Price bucket type
export type PriceBucket = '0-1' | '1-5' | '5-20' | '20-50' | '50-100' | '100-200' | '200-400' | '400-1000' | '1000+';

// Helper to get price bucket
export function getPriceBucket(price: number): PriceBucket {
  if (price < 1) return '0-1';
  if (price < 5) return '1-5';
  if (price < 20) return '5-20';
  if (price < 50) return '20-50';
  if (price < 100) return '50-100';
  if (price < 200) return '100-200';
  if (price < 400) return '200-400';
  if (price < 1000) return '400-1000';
  return '1000+';
}

// Aggregate trades by price
export function aggregateByPrice(trades: TradeData[]) {
  const buckets: PriceBucket[] = ['0-1', '1-5', '5-20', '20-50', '50-100', '100-200', '200-400', '400-1000', '1000+'];
  const distribution: Record<PriceBucket, number> = {} as Record<PriceBucket, number>;
  const performance: Record<PriceBucket, number> = {} as Record<PriceBucket, number>;
  
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
      distribution[bucket] += Number(trade.quantity || 0);
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
export function aggregateByVolume(trades: TradeData[]) {
  const buckets: VolumeBucket[] = ['<50', '50-100', '100-200', '200-500', '500-1000', '1000-2000', '2000-5000', '>5000'];
  const distribution: Record<VolumeBucket, number> = {} as Record<VolumeBucket, number>;
  const performance: Record<VolumeBucket, number> = {} as Record<VolumeBucket, number>;
  
  // Initialize all buckets to ensure they all appear even if empty
  buckets.forEach(bucket => {
    distribution[bucket] = 0;
    performance[bucket] = 0;
  });
  
  // Aggregate
  trades.forEach(trade => {
    const volume = Number(trade.quantity || 0);
    const bucket = getVolumeBucket(volume);
    distribution[bucket] += Number(trade.quantity || 0);
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

// Win/Loss/Expectation aggregation functions

// Calculate win/loss ratio data
export function calculateWinLossRatio(trades: TradeData[]) {
  // API already filters for closed trades
  const wins = trades.filter(t => Number(t.pnl) > 0).length;
  const losses = trades.filter(t => Number(t.pnl) < 0).length;
  const scratches = trades.filter(t => Number(t.pnl) === 0).length;
  const total = trades.length;

  return {
    wins,
    losses,
    scratches,
    winRate: total > 0 ? (wins / total) * 100 : 0,
    lossRate: total > 0 ? (losses / total) * 100 : 0,
    scratchRate: total > 0 ? (scratches / total) * 100 : 0,
    totalTrades: total
  };
}

// Calculate win/loss P&L comparison
export function calculateWinLossPnlComparison(trades: TradeData[]) {
  // API already filters for closed trades
  const winningTrades = trades.filter(t => Number(t.pnl) > 0);
  const losingTrades = trades.filter(t => Number(t.pnl) < 0);

  const totalWins = winningTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl), 0));
  
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

  const pnlValues = trades.map(t => Number(t.pnl));
  const largestWin = Math.max(...pnlValues.filter(p => p > 0), 0);
  const largestLoss = Math.abs(Math.min(...pnlValues.filter(p => p < 0), 0));

  return {
    avgWin,
    avgLoss,
    totalWins,
    totalLosses,
    largestWin,
    largestLoss,
    winCount: winningTrades.length,
    lossCount: losingTrades.length
  };
}

// Calculate trade expectation
export function calculateTradeExpectation(trades: TradeData[]) {
  // API already filters for closed trades
  const winLossData = calculateWinLossPnlComparison(trades);
  
  const winRate = winLossData.winCount / (winLossData.winCount + winLossData.lossCount) || 0;
  const lossRate = 1 - winRate;
  
  // Expectation = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const expectation = (winRate * winLossData.avgWin) - (lossRate * winLossData.avgLoss);
  
  // Profit Factor = Total Wins / Total Losses
  const profitFactor = winLossData.totalLosses > 0 ? winLossData.totalWins / winLossData.totalLosses : 0;
  
  // Payoff Ratio = Avg Win / Avg Loss
  const payoffRatio = winLossData.avgLoss > 0 ? winLossData.avgWin / winLossData.avgLoss : 0;
  
  // Kelly Percentage = Win Rate - (Loss Rate / Payoff Ratio)
  const kellyPercentage = payoffRatio > 0 ? (winRate - (lossRate / payoffRatio)) * 100 : 0;

  return {
    expectation,
    expectationPerTrade: expectation,
    profitFactor,
    payoffRatio,
    winRate: winRate * 100,
    avgWin: winLossData.avgWin,
    avgLoss: winLossData.avgLoss,
    kellyPercentage: Math.max(0, Math.min(100, kellyPercentage)) // Clamp between 0-100
  };
}

// Calculate cumulative P&L over time
export function calculateCumulativePnl(trades: TradeData[], startDate?: string) {
  // API already filters for closed trades
  const sortedTrades = trades
    .sort((a, b) => {
      const dateA = a.exitDate || a.date;
      const dateB = b.exitDate || b.date;
      if (!dateA || !dateB) return 0;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  let cumulative = 0;
  const cumulativeData: Array<{ date: string; value: number; trades?: number }> = [];

  // Add starting point at the beginning of selected time period if provided
  if (startDate) {
    cumulativeData.push({
      date: startDate,
      value: 0
    });
  }

  // Group trades by date
  const tradesByDate = sortedTrades.reduce((acc: Record<string, TradeData[]>, trade) => {
    const tradeDate = trade.exitDate || trade.date;
    if (tradeDate) {
      const date = new Date(tradeDate).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(trade);
    }
    return acc;
  }, {});

  // Calculate cumulative P&L for each date
  Object.keys(tradesByDate).sort().forEach(date => {
    const dayTrades = tradesByDate[date];
    const dayPnl = dayTrades.reduce((sum: number, t: TradeData) => sum + Number(t.pnl), 0);
    cumulative += dayPnl;
    
    cumulativeData.push({
      date,
      value: cumulative,
      trades: dayTrades.length
    });
  });

  return cumulativeData;
}

// Calculate cumulative drawdown
export function calculateCumulativeDrawdown(trades: TradeData[], startDate?: string) {
  const cumulativePnl = calculateCumulativePnl(trades, startDate);
  
  let peak = 0;
  const drawdownData: Array<{ date: string; drawdown: number; drawdownPercent: number; underwater: number }> = [];

  cumulativePnl.forEach(point => {
    peak = Math.max(peak, point.value);
    const drawdown = peak > 0 ? point.value - peak : 0;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    
    drawdownData.push({
      date: point.date,
      drawdown,
      drawdownPercent,
      underwater: drawdown < 0 ? Math.abs(drawdownPercent) : 0
    });
  });

  return drawdownData;
}

// Reusable function to aggregate win rates by time intervals
export function aggregateWinRatesByInterval(
  dailyData: Array<{ date: string; winRate: number; wins: number; losses: number; trades: number }>,
  intervalType: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Array<{ date: string; value: number }> {
  if (intervalType === 'daily') {
    // Return daily data as-is
    return dailyData.map(day => ({
      date: day.date,
      value: day.winRate
    }));
  }

  // Aggregate by the specified interval
  const aggregated = new Map<string, { wins: number; losses: number; trades: number }>();

  dailyData.forEach(day => {
    const date = new Date(day.date);
    let periodKey: string;

    switch (intervalType) {
      case 'weekly':
        // Get the Monday of the week for consistent grouping
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        periodKey = monday.toISOString().split('T')[0];
        break;
      case 'monthly':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        periodKey = date.getFullYear().toString();
        break;
      default:
        periodKey = day.date;
    }

    const existing = aggregated.get(periodKey) || { wins: 0, losses: 0, trades: 0 };
    existing.wins += day.wins;
    existing.losses += day.losses;
    existing.trades += day.trades;
    aggregated.set(periodKey, existing);
  });

  // Convert to array and calculate win rates
  return Array.from(aggregated.entries()).map(([date, data]) => ({
    date,
    value: data.trades > 0 ? parseFloat(((data.wins / data.trades) * 100).toFixed(2)) : 0
  })).sort((a, b) => a.date.localeCompare(b.date));
}