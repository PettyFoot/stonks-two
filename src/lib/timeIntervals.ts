/**
 * Time interval utilities for chart x-axis labeling and data bucketing
 */

export type IntervalType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface TimeInterval {
  type: IntervalType;
  format: string;
  tickCount: number;
  description: string;
}

/**
 * Determine optimal time interval based on date range
 * Updated per user requirements:
 * - ≤1 week (7 days): daily intervals
 * - ≤1 month (30 days): weekly intervals  
 * - default (30-365 days): monthly intervals
 * - >1 year (365 days): yearly intervals
 */
export function determineOptimalInterval(
  dateRange: { start: Date; end: Date }
): TimeInterval {
  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff <= 7) {
    return {
      type: 'daily',
      format: 'MMM dd',
      tickCount: Math.min(daysDiff, 7),
      description: 'Daily intervals'
    };
  }
  
  if (daysDiff <= 30) {
    return {
      type: 'weekly',
      format: 'MMM dd',
      tickCount: Math.min(Math.ceil(daysDiff / 7), 4),
      description: 'Weekly intervals'
    };
  }
  
  if (daysDiff <= 365) {
    return {
      type: 'monthly',
      format: 'MMM yyyy',
      tickCount: daysDiff >= 300 ? 12 : Math.min(Math.ceil(daysDiff / 30), 12), // Show all 12 months for near-yearly data
      description: 'Monthly intervals'
    };
  }
  
  return {
    type: 'yearly',
    format: 'yyyy',
    tickCount: Math.min(Math.ceil(daysDiff / 365), 10),
    description: 'Yearly intervals'
  };
}

/**
 * Generate evenly spaced ticks for a given date range and interval type
 */
export function generateTimeTicks(
  dateRange: { start: Date; end: Date },
  intervalType: IntervalType,
  maxTicks: number = 12
): Date[] {
  const ticks: Date[] = [];
  const { start, end } = dateRange;
  
  switch (intervalType) {
    case 'daily': {
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const step = Math.max(1, Math.ceil(daysDiff / maxTicks));
      
      for (let i = 0; i <= daysDiff; i += step) {
        const tick = new Date(start);
        tick.setDate(start.getDate() + i);
        ticks.push(tick);
      }
      break;
    }
    
    case 'weekly': {
      const current = new Date(start);
      // Find the start of the week (Monday)
      const dayOfWeek = current.getDay();
      const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      current.setDate(diff);
      
      while (current <= end) {
        ticks.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }
      break;
    }
    
    case 'monthly': {
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      
      while (current <= end) {
        ticks.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      break;
    }
    
    case 'yearly': {
      const current = new Date(start.getFullYear(), 0, 1);
      
      while (current <= end) {
        ticks.push(new Date(current));
        current.setFullYear(current.getFullYear() + 1);
      }
      break;
    }
  }
  
  return ticks;
}

/**
 * Format a date based on interval type
 */
export function formatDateForInterval(date: Date, intervalType: IntervalType): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  switch (intervalType) {
    case 'daily':
      return `${months[date.getMonth()]} ${date.getDate()}`;
      
    case 'weekly':
      return `${months[date.getMonth()]} ${date.getDate()}`;
      
    case 'monthly':
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
      
    case 'yearly':
      return date.getFullYear().toString();
      
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Format a date range showing "first date - last date" based on actual data timeframe
 */
export function formatDateRangeForInterval(
  startDate: Date, 
  endDate: Date, 
  intervalType: IntervalType
): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // If dates are the same, return single date
  if (startDate.getTime() === endDate.getTime()) {
    return formatDateForInterval(startDate, intervalType);
  }
  
  switch (intervalType) {
    case 'daily':
      // For daily intervals, show "Jan 15 - Jan 20" or "Jan 15 - Feb 3"
      if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
        return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${endDate.getDate()}`;
      }
      return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${months[endDate.getMonth()]} ${endDate.getDate()}`;
      
    case 'weekly':
      // For weekly intervals, show "Jan 8 - Jan 15" or "Jan 29 - Feb 5"
      if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
        return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${endDate.getDate()}`;
      }
      return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${months[endDate.getMonth()]} ${endDate.getDate()}`;
      
    case 'monthly':
      // For monthly intervals, show "Jan 2024 - Dec 2024" or "Jan 2024"
      if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
        return `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
      }
      if (startDate.getFullYear() === endDate.getFullYear()) {
        return `${months[startDate.getMonth()]} - ${months[endDate.getMonth()]} ${startDate.getFullYear()}`;
      }
      return `${months[startDate.getMonth()]} ${startDate.getFullYear()} - ${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
      
    case 'yearly':
      // For yearly intervals, show "2023 - 2024" or "2024"
      if (startDate.getFullYear() === endDate.getFullYear()) {
        return startDate.getFullYear().toString();
      }
      return `${startDate.getFullYear()} - ${endDate.getFullYear()}`;
      
    default:
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }
}

/**
 * Parse period strings from API responses to dates
 */
export function parsePeriodToDate(period: string, intervalType: IntervalType): Date {
  switch (intervalType) {
    case 'daily':
      return new Date(period);
      
    case 'weekly': {
      // Handle format like "2024-W15"
      const match = period.match(/(\d{4})-W(\d{2})/);
      if (match) {
        const year = parseInt(match[1]);
        const week = parseInt(match[2]);
        // Calculate date from week number
        const jan1 = new Date(year, 0, 1);
        const daysOffset = (week - 1) * 7;
        return new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      }
      return new Date(period);
    }
    
    case 'monthly': {
      // Handle format like "2024-03"
      const [year, month] = period.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    }
    
    case 'yearly':
      return new Date(parseInt(period), 0, 1);
      
    default:
      return new Date(period);
  }
}

/**
 * Calculate the appropriate tick interval for Recharts based on data length
 */
export function calculateTickInterval(dataLength: number, maxTicks: number = 8): number {
  if (dataLength <= maxTicks) return 0; // Show all ticks
  
  // For yearly data (around 12 months), show every 2nd or 3rd month if needed
  if (dataLength === 12 && maxTicks >= 6) return 1; // Show every other month for 12 months
  if (dataLength === 12 && maxTicks >= 4) return 2; // Show every 3rd month for 12 months
  
  return Math.ceil(dataLength / maxTicks);
}

/**
 * Get axis domain for time-based charts
 */
export function getTimeAxisDomain(
  data: Array<{ date: string; value: number }>,
  intervalType: IntervalType
): [string, string] {
  if (data.length === 0) return ['dataMin', 'dataMax'];
  
  const dates = data.map(d => parsePeriodToDate(d.date, intervalType));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  return [
    formatDateForInterval(minDate, intervalType),
    formatDateForInterval(maxDate, intervalType)
  ];
}