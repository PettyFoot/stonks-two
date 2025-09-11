import { TimeWindow, TradeContext } from './types';

/**
 * Calculates optimal time window and interval for a trade's candlestick chart
 */
export class TimeWindowCalculator {
  /**
   * Calculate 24-hour window for the trade date
   */
  static calculateOptimalWindow(tradeContext: TradeContext): TimeWindow {
    const { date } = tradeContext;
    
    // Parse trade date and ensure we're working with the correct timezone
    // Parse date string with noon time to avoid timezone issues
    const tradeDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(date + 'T12:00:00')
      : new Date(date + 'T12:00:00');
    
    console.log(`📅 TimeWindow calculation for ${date}:`, {
      originalDate: tradeDate.toISOString(),
      localDate: tradeDate.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    // Create extended trading hours window (4:00 AM to 8:00 PM) for US markets
    // Use UTC methods to ensure consistent timezone handling
    const start = new Date(tradeDate.getFullYear(), tradeDate.getMonth(), tradeDate.getDate());
    start.setHours(4, 0, 0, 0); // 4:00 AM local time (pre-market start)
    
    const end = new Date(tradeDate.getFullYear(), tradeDate.getMonth(), tradeDate.getDate());
    end.setHours(20, 0, 0, 0); // 8:00 PM local time (after-hours end)
    
    console.log(`⏰ Trading window:`, {
      start: start.toISOString(),
      end: end.toISOString(),
      startLocal: start.toLocaleString(),
      endLocal: end.toLocaleString()
    });
    
    return {
      start,
      end,
      interval: '5m', // Default interval
      focusTime: undefined // No specific focus time for full day view
    };
  }
  
  
  /**
   * Calculate time window for a specific interval override
   */
  static calculateWindowForInterval(
    tradeContext: TradeContext, 
    interval: '1m' | '5m' | '15m' | '1h' | '1d'
  ): TimeWindow {
    const { date } = tradeContext;
    
    // Parse trade date and ensure consistent timezone handling
    // Parse date string with noon time to avoid timezone issues
    const tradeDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(date + 'T12:00:00')
      : new Date(date + 'T12:00:00');
    
    console.log(`📅 TimeWindow calculation for ${date} (${interval} interval):`);
    
    // Always use extended trading hours window regardless of interval
    // Create new Date objects to avoid mutation issues
    const start = new Date(tradeDate.getFullYear(), tradeDate.getMonth(), tradeDate.getDate());
    start.setHours(4, 0, 0, 0); // 4:00 AM local time (pre-market start)
    
    const end = new Date(tradeDate.getFullYear(), tradeDate.getMonth(), tradeDate.getDate());
    end.setHours(20, 0, 0, 0); // 8:00 PM local time (after-hours end)
    
    console.log(`⏰ ${interval} trading window:`, {
      start: start.toISOString(),
      end: end.toISOString(),
      startLocal: start.toLocaleString(),
      endLocal: end.toLocaleString()
    });
    
    return {
      start,
      end,
      interval,
      focusTime: undefined // No specific focus time for full day view
    };
  }
  
  /**
   * Check if a time window is valid for market hours
   */
  static isValidMarketTime(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    // Check if it's a weekday (Monday = 1, Friday = 5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Weekend
    }
    
    // Check if it's during market hours (9:30 AM to 4:00 PM EST)
    const marketStart = 9 * 60 + 30; // 9:30 AM in minutes
    const marketEnd = 16 * 60;       // 4:00 PM in minutes
    const currentTime = hour * 60 + minute;
    
    return currentTime >= marketStart && currentTime <= marketEnd;
  }
  
  /**
   * Format time window for API requests
   */
  static formatForAPI(window: TimeWindow) {
    return {
      startDate: window.start.toISOString().split('T')[0],
      startTime: window.start.toTimeString().split(' ')[0],
      endDate: window.end.toISOString().split('T')[0],
      endTime: window.end.toTimeString().split(' ')[0],
      interval: window.interval,
      focusTime: window.focusTime?.toISOString()
    };
  }
}