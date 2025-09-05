import { Decimal } from '@prisma/client/runtime/library';
import { format } from 'date-fns';

export interface Trade {
  id: string;
  date: Date;
  exitDate?: Date | null;
  pnl: number | Decimal;
}

export interface CumulativePnlPoint {
  date: string;
  value: number;
}

/**
 * Calculate cumulative P&L using the same logic as the reports page
 * Groups trades by exit date when available, falling back to entry date
 * Ensures consistent data across dashboard and reports
 */
export function calculateCumulativePnl(
  trades: Trade[],
  startDate?: Date
): CumulativePnlPoint[] {
  // Group trades by date for daily P&L calculation
  const dailyPnlMap = new Map<string, number>();

  trades.forEach(trade => {
    // Use exitDate for grouping when available, fallback to entry date
    const groupingDate = trade.exitDate || trade.date;
    const dateKey = format(groupingDate, 'yyyy-MM-dd');
    
    const pnlValue = trade.pnl instanceof Decimal ? trade.pnl.toNumber() : Number(trade.pnl);
    const existing = dailyPnlMap.get(dateKey) || 0;
    dailyPnlMap.set(dateKey, existing + pnlValue);
  });

  // Convert to sorted array
  const dailyPnl = Array.from(dailyPnlMap.entries())
    .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cumulativePnl: CumulativePnlPoint[] = [];
  
  // Add starting point at the beginning of selected time period
  if (startDate) {
    cumulativePnl.push({
      date: format(startDate, 'yyyy-MM-dd'),
      value: 0
    });
  } else if (dailyPnl.length > 0) {
    // If no startDate, start from the earliest trade date
    const earliestDate = dailyPnl[0].date;
    cumulativePnl.push({
      date: earliestDate,
      value: 0
    });
  }
  
  let cumulativeSum = 0;
  dailyPnl.forEach(day => {
    cumulativeSum += day.pnl;
    cumulativePnl.push({
      date: day.date,
      value: parseFloat(cumulativeSum.toFixed(2))
    });
  });

  return cumulativePnl;
}