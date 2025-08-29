import { MarketDataProvider, OHLCData, TimeWindow, TradeContext } from '../types';

/**
 * Alpha Vantage provider for market data
 * Free tier: 25 requests/day, 5 requests/minute
 * Much better historical data support than Yahoo Finance
 */
export class AlphaVantageProvider implements MarketDataProvider {
  name = 'Alpha Vantage';
  private apiKey: string;
  private requestCount = 0;
  private lastRequestTime = 0;
  
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  }
  
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'demo';
  }
  
  /**
   * Fetch OHLC data from Alpha Vantage
   */
  async fetchOHLC(
    symbol: string, 
    timeWindow: TimeWindow, 
    _tradeContext?: TradeContext
  ): Promise<OHLCData[]> {
    try {
      // Rate limiting: max 5 requests per minute
      await this.enforceRateLimit();
      
      // Convert interval to Alpha Vantage format
      const avInterval = this.convertInterval(timeWindow.interval);
      
      // Build API URL
      const params = new URLSearchParams({
        function: 'TIME_SERIES_INTRADAY',
        symbol: symbol.toUpperCase(),
        interval: avInterval,
        apikey: this.apiKey,
        outputsize: 'full', // Get full data, not just last 100 points
        datatype: 'json'
      });
      
      const url = `https://www.alphavantage.co/query?${params.toString()}`;
      
      console.log(`Alpha Vantage API call for ${symbol} (${avInterval})`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for API errors
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }
      
      if (data['Note']) {
        throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
      }
      
      if (data['Information']) {
        throw new Error(`Alpha Vantage info: ${data['Information']}`);
      }
      
      // Extract time series data
      const timeSeriesKey = `Time Series (${avInterval})`;
      const timeSeries = data[timeSeriesKey];
      
      if (!timeSeries) {
        throw new Error(`No time series data found for ${symbol}. Available keys: ${Object.keys(data).join(', ')}`);
      }
      
      // Convert to our format and filter by time window
      const ohlcData: OHLCData[] = [];
      
      for (const [timestamp, values] of Object.entries(timeSeries)) {
        const candle = values as Record<string, string>;
        const candleTime = new Date(timestamp).getTime();
        
        // Filter to requested time window
        if (candleTime >= timeWindow.start.getTime() && candleTime <= timeWindow.end.getTime()) {
          ohlcData.push({
            timestamp: candleTime,
            open: Number(candle['1. open']),
            high: Number(candle['2. high']),
            low: Number(candle['3. low']),
            close: Number(candle['4. close']),
            volume: Number(candle['5. volume'])
          });
        }
      }
      
      // Sort chronologically
      ohlcData.sort((a, b) => a.timestamp - b.timestamp);
      
      // Log data quality
      if (ohlcData.length > 0) {
        const firstCandle = new Date(ohlcData[0].timestamp);
        const lastCandle = new Date(ohlcData[ohlcData.length - 1].timestamp);
        const timeSpan = (lastCandle.getTime() - firstCandle.getTime()) / (1000 * 60 * 60);
        
        console.log(`Alpha Vantage data for ${symbol}:`);
        console.log(`  - ${ohlcData.length} candles from ${firstCandle.toLocaleTimeString()} to ${lastCandle.toLocaleTimeString()}`);
        console.log(`  - Time span: ${timeSpan.toFixed(2)} hours`);
        console.log(`  - Requested window: ${timeWindow.start.toLocaleString()} to ${timeWindow.end.toLocaleString()}`);
      }
      
      return ohlcData;
      
    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Alpha Vantage rate limit exceeded. Please wait and try again.');
        }
        if (error.message.includes('Invalid API call')) {
          throw new Error(`Symbol ${symbol} not found or invalid.`);
        }
        if (error.message.includes('premium')) {
          throw new Error('Alpha Vantage premium feature required for this request.');
        }
      }
      
      throw new Error(`Alpha Vantage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Convert our interval format to Alpha Vantage format
   */
  private convertInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '60min'
    };
    
    const mapped = intervalMap[interval];
    if (!mapped) {
      throw new Error(`Interval ${interval} not supported by Alpha Vantage. Supported: ${Object.keys(intervalMap).join(', ')}`);
    }
    
    return mapped;
  }
  
  /**
   * Enforce rate limiting (5 requests per minute)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // If less than 12 seconds since last request, wait
    if (timeSinceLastRequest < 12000) {
      const waitTime = 12000 - timeSinceLastRequest;
      console.log(`Alpha Vantage rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
  
  /**
   * Check if the symbol is likely valid
   */
  static isValidSymbol(symbol: string): boolean {
    if (!symbol || symbol.length === 0) return false;
    if (symbol.length > 10) return false;
    return /^[A-Z0-9.\-]+$/i.test(symbol);
  }
  
  /**
   * Get rate limit info
   */
  getRateLimitInfo() {
    return {
      requestsPerMinute: 5,
      requestsPerDay: 25,
      burstLimit: 1,
      cooldownSeconds: 12,
      currentCount: this.requestCount
    };
  }
  
  /**
   * Test connection to Alpha Vantage
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      
      // Test with a simple query
      const params = new URLSearchParams({
        function: 'GLOBAL_QUOTE',
        symbol: 'AAPL',
        apikey: this.apiKey
      });
      
      const response = await fetch(`https://www.alphavantage.co/query?${params.toString()}`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return !data['Error Message'] && !data['Note'] && !!data['Global Quote'];
      
    } catch (error) {
      console.error('Alpha Vantage connection test failed:', error);
      return false;
    }
  }
}