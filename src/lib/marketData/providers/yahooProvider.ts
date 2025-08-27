import yahooFinance from 'yahoo-finance2';
import { MarketDataProvider, OHLCData, TimeWindow, TradeContext } from '../types';

/**
 * Yahoo Finance provider for market data (free, no API key required)
 */
export class YahooFinanceProvider implements MarketDataProvider {
  name = 'Yahoo Finance';
  
  isAvailable(): boolean {
    // Yahoo Finance should always be available (no API key required)
    return true;
  }
  
  /**
   * Fetch OHLC data from Yahoo Finance
   */
  async fetchOHLC(
    symbol: string, 
    timeWindow: TimeWindow, 
    _tradeContext?: TradeContext
  ): Promise<OHLCData[]> {
    try {
      // Check if date is within Yahoo Finance's 60-day window for intraday data
      if (this.isDateTooOld(timeWindow.start, timeWindow.interval)) {
        throw new Error(`Intraday data for ${timeWindow.interval} interval is only available for the last 60 days`);
      }
      
      // Clean the symbol (remove any suffixes, handle options symbols)
      const cleanSymbol = this.cleanSymbol(symbol);
      
      // Convert interval to Yahoo Finance format
      const yahooInterval = this.convertInterval(timeWindow.interval);
      
      // Fetch data from Yahoo Finance
      const result = await yahooFinance.chart(cleanSymbol, {
        period1: timeWindow.start,
        period2: timeWindow.end,
        interval: yahooInterval as any,
        includePrePost: true // Include pre-market and after-hours data
      });
      
      if (!result.quotes || result.quotes.length === 0) {
        throw new Error(`No data available for ${symbol} in the specified time range`);
      }
      
      // Transform Yahoo Finance data to our format and filter anomalous data points
      const requestedDate = timeWindow.start;
      const requestedDateStr = requestedDate.toISOString().split('T')[0];
      
      const filteredData = result.quotes
        .filter((quote: any) => {
          // Basic data validation
          if (!quote.date || !quote.open || !quote.high || !quote.low || !quote.close) {
            return false;
          }
          
          // More flexible date filtering - include data within the requested time window
          // instead of strict date matching to avoid timezone issues
          const quoteTimestamp = quote.date!.getTime();
          return quoteTimestamp >= timeWindow.start.getTime() && quoteTimestamp <= timeWindow.end.getTime();
        })
        .map((quote: any) => ({
          timestamp: quote.date!.getTime(),
          open: Number(quote.open!),
          high: Number(quote.high!),
          low: Number(quote.low!),
          close: Number(quote.close!),
          volume: quote.volume ? Number(quote.volume) : undefined
        }))
        .sort((a: any, b: any) => a.timestamp - b.timestamp); // Ensure chronological order
        
      // Log data quality information
      if (filteredData.length > 0) {
        const firstCandle = new Date(filteredData[0].timestamp);
        const lastCandle = new Date(filteredData[filteredData.length - 1].timestamp);
        const timeSpan = (lastCandle.getTime() - firstCandle.getTime()) / (1000 * 60 * 60);
        
        console.log(`Yahoo Finance data for ${symbol}:`);
        console.log(`  - ${filteredData.length} candles from ${firstCandle.toLocaleTimeString()} to ${lastCandle.toLocaleTimeString()}`);
        console.log(`  - Time span: ${timeSpan.toFixed(2)} hours`);
        console.log(`  - Requested window: ${timeWindow.start.toLocaleString()} to ${timeWindow.end.toLocaleString()}`);
        
        // Check for gaps in data
        let gaps = 0;
        const intervalMs = timeWindow.interval === '1m' ? 60000 : 
                         timeWindow.interval === '5m' ? 300000 :
                         timeWindow.interval === '15m' ? 900000 :
                         timeWindow.interval === '1h' ? 3600000 : 300000; // default 5m
        
        for (let i = 1; i < filteredData.length; i++) {
          const expectedNext = filteredData[i-1].timestamp + intervalMs;
          if (filteredData[i].timestamp > expectedNext + 60000) { // 1 minute tolerance
            gaps++;
          }
        }
        
        if (gaps > 0) {
          console.log(`  - Warning: ${gaps} gaps detected in the data`);
        }
      }
      
      return filteredData;
        
    } catch (error) {
      console.error(`Yahoo Finance error for ${symbol}:`, error);
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Not Found')) {
          throw new Error(`Symbol ${symbol} not found. Please check the ticker symbol.`);
        }
        if (error.message.includes('network')) {
          throw new Error('Network error connecting to Yahoo Finance. Please try again.');
        }
      }
      
      throw new Error(`Yahoo Finance unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if date is too old for Yahoo Finance intraday data
   */
  private isDateTooOld(date: Date, interval: string): boolean {
    // Daily data has longer retention, only check intraday intervals
    const intradayIntervals = ['1m', '2m', '5m', '15m', '30m'];
    if (!intradayIntervals.includes(interval)) {
      return false; // Daily and weekly data has longer retention
    }
    
    const now = new Date();
    const daysDifference = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    // Yahoo Finance keeps intraday data for approximately 60 days
    return daysDifference > 60;
  }
  
  /**
   * Clean symbol for Yahoo Finance compatibility
   */
  private cleanSymbol(symbol: string): string {
    // Remove common suffixes and handle special cases
    let cleaned = symbol.toUpperCase().trim();
    
    // Handle common broker suffixes
    cleaned = cleaned.replace(/\.(NYSE|NASDAQ|AMEX)$/, '');
    
    // Handle options symbols (basic cleanup)
    if (cleaned.includes('_') || cleaned.length > 5) {
      // For now, extract just the underlying symbol from options
      // More sophisticated options handling could be added later
      const parts = cleaned.split('_');
      if (parts.length > 0) {
        cleaned = parts[0];
      }
    }
    
    return cleaned;
  }
  
  /**
   * Convert our interval format to Yahoo Finance format
   */
  private convertInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '2m': '2m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '1d': '1d',
      '5d': '5d',
      '1wk': '1wk',
      '1mo': '1mo',
      '3mo': '3mo'
    };
    
    return intervalMap[interval] || '5m'; // Default to 5m if not found
  }
  
  /**
   * Check if the symbol is likely valid for Yahoo Finance
   */
  static isValidSymbol(symbol: string): boolean {
    // Basic symbol validation
    if (!symbol || symbol.length === 0) return false;
    if (symbol.length > 10) return false; // Most stock symbols are 5 chars or less
    
    // Should contain only letters, numbers, dots, and hyphens
    return /^[A-Z0-9.\-_]+$/i.test(symbol);
  }
  
  /**
   * Get rate limit info (Yahoo Finance is generally lenient but has informal limits)
   */
  getRateLimitInfo() {
    return {
      requestsPerMinute: 100, // Estimated safe limit
      requestsPerDay: 2000,   // Estimated safe limit
      burstLimit: 10,         // Safe burst requests
      cooldownSeconds: 1      // Recommended delay between requests
    };
  }
  
  /**
   * Test connection to Yahoo Finance
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a reliable symbol (Apple)
      const result = await yahooFinance.chart('AAPL', {
        period1: new Date(Date.now() - 86400000), // Yesterday
        period2: new Date(), // Now
        interval: '5m'
      });
      
      return result && result.quotes && result.quotes.length > 0;
    } catch (error) {
      console.error('Yahoo Finance connection test failed:', error);
      return false;
    }
  }
}