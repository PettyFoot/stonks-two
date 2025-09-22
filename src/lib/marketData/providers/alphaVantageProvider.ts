import { MarketDataProvider, OHLCData, TimeWindow, TradeContext, ProviderResponse } from '../types';

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
    this.apiKey = process.env.ALPHA_VANTAGE_FREE_API_KEY || 'demo';
  }
  
  isAvailable(): boolean {
    const available = !!this.apiKey && this.apiKey !== 'demo';
    if (!available) {
      if (!this.apiKey) {

      } else if (this.apiKey === 'demo') {

      }
    } else {

    }
    return available;
  }
  
  /**
   * Fetch OHLC data from Alpha Vantage
   */
  async fetchOHLC(
    symbol: string,
    timeWindow: TimeWindow,
    _tradeContext?: TradeContext
  ): Promise<ProviderResponse> {
    try {
      // Rate limiting: max 5 requests per minute
      await this.enforceRateLimit();
      
      // Use the timeWindow as-is - no date adjustment needed
      
      // Determine if we need daily or intraday data
      const isDailyInterval = timeWindow.interval === '1d';
      
      let params: URLSearchParams;
      let timeSeriesKey: string;
      
      if (isDailyInterval) {
        // Use TIME_SERIES_DAILY for daily data
        params = new URLSearchParams({
          function: 'TIME_SERIES_DAILY',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey,
          outputsize: 'full', // Get full historical data
          datatype: 'json'
        });
        timeSeriesKey = 'Time Series (Daily)';
      } else {
        // Use TIME_SERIES_INTRADAY for intraday data
        const avInterval = this.convertInterval(timeWindow.interval);
        
        params = new URLSearchParams({
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol.toUpperCase(),
          interval: avInterval,
          apikey: this.apiKey,
          outputsize: 'full',
          extended_hours: 'true', // Include pre-market and after-hours
          datatype: 'json'
        });
        
        // For historical dates (older than current month), use month parameter
        const currentDate = new Date();
        const requestDate = new Date(timeWindow.start);
        const isHistorical = requestDate.getMonth() !== currentDate.getMonth() || 
                           requestDate.getFullYear() !== currentDate.getFullYear();
        
        if (isHistorical) {
          const monthParam = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;
          params.set('month', monthParam);

        }
        
        timeSeriesKey = `Time Series (${avInterval})`;
      }
      
      const url = `https://www.alphavantage.co/query?${params.toString()}`;
      
      
      const response = await fetch(url);
      
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Alpha Vantage HTTP error response:`, errorText);
        throw new Error(`Alpha Vantage API HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ Failed to parse JSON response:`, parseError);
        console.error(`📄 Full response text:`, responseText);
        throw new Error(`Alpha Vantage API returned invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }
      
      // Check for API errors with detailed logging
      if (data['Error Message']) {
        console.error(`❌ Alpha Vantage Error Message:`, data['Error Message']);
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }
      
      if (data['Note']) {
        console.error(`❌ Alpha Vantage Rate Limit Note:`, data['Note']);
        // Check if this is the specific 5 requests per minute limit
        if (data['Note'].includes('5 calls per minute') || data['Note'].includes('5 requests per minute')) {
          throw new Error(`ALPHA_VANTAGE_RATE_LIMIT_5_PER_MINUTE: ${data['Note']}`);
        }
        throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
      }
      
      if (data['Information']) {
        console.error(`❌ Alpha Vantage Information Message:`, data['Information']);
        // Check if this is the daily limit message
        if (data['Information'].includes('25 requests per day') || data['Information'].includes('daily rate limit')) {
          throw new Error(`ALPHA_VANTAGE_DAILY_LIMIT: Daily limit of 25 requests exceeded. Please try again tomorrow or upgrade to a premium plan.`);
        }
        throw new Error(`Alpha Vantage info: ${data['Information']}`);
      }
      
      // Check for empty or invalid response structure
      if (!data || typeof data !== 'object') {
        console.error(`❌ Alpha Vantage returned invalid data structure:`, data);
        throw new Error('Alpha Vantage returned invalid data structure');
      }
      
      // Extract time series data
      const timeSeries = data[timeSeriesKey];
      
      
      if (!timeSeries) {
        console.error(`❌ No time series data found for key: "${timeSeriesKey}"`);
        console.error(`📊 Full response data:`, JSON.stringify(data, null, 2));
        throw new Error(`No time series data found for ${symbol}. Expected key: "${timeSeriesKey}". Available keys: ${Object.keys(data).join(', ')}`);
      }
      

      if (Object.keys(timeSeries).length > 0) {
        const firstKey = Object.keys(timeSeries)[0];
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
        const timeSpan = isDailyInterval 
          ? (lastCandle.getTime() - firstCandle.getTime()) / (1000 * 60 * 60 * 24) // days
          : (lastCandle.getTime() - firstCandle.getTime()) / (1000 * 60 * 60); // hours
        




      }
      
      // Alpha Vantage provides real-time data, so never delayed
      return {
        data: ohlcData,
        delayed: false
      };
      
    } catch (error) {
      console.error(`❌ Alpha Vantage error for ${symbol}:`, error);
      console.error(`📅 Requested date range: ${timeWindow.start.toISOString()} to ${timeWindow.end.toISOString()}`);
      console.error(`⚙️ Interval: ${timeWindow.interval}`);
      
      if (error instanceof Error) {
        if (error.message.includes('ALPHA_VANTAGE_DAILY_LIMIT')) {
          throw new Error('ALPHA_VANTAGE_DAILY_LIMIT: Daily limit of 25 requests exceeded. Please try again tomorrow or upgrade to a premium plan.');
        }
        if (error.message.includes('ALPHA_VANTAGE_RATE_LIMIT_5_PER_MINUTE')) {
          throw new Error('ALPHA_VANTAGE_RATE_LIMIT_5_PER_MINUTE: Alpha Vantage rate limit exceeded (5 requests/minute). Please wait and try again.');
        }
        if (error.message.includes('rate limit')) {
          throw new Error('ALPHA_VANTAGE_RATE_LIMIT_5_PER_MINUTE: Alpha Vantage rate limit exceeded (5 requests/minute). Please wait and try again.');
        }
        if (error.message.includes('Invalid API call')) {
          throw new Error(`Symbol ${symbol} not found or invalid API parameters.`);
        }
        if (error.message.includes('premium')) {
          throw new Error('Alpha Vantage premium subscription required for this feature.');
        }
        if (error.message.includes('No time series data')) {
          throw new Error(`No market data available for ${symbol} on the requested date. This could be a non-trading day or the data might not be available yet.`);
        }
      }
      
      throw new Error(`Alpha Vantage API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Daily intervals are handled separately in fetchOHLC method
    if (interval === '1d') {
      throw new Error('Daily interval should be handled by TIME_SERIES_DAILY endpoint');
    }
    
    const mapped = intervalMap[interval];
    if (!mapped) {
      throw new Error(`Interval ${interval} not supported by Alpha Vantage. Supported: ${Object.keys(intervalMap).join(', ')}, 1d`);
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

      await new Promise(resolve => setTimeout(resolve, waitTime));

    } else {

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
      
      const testUrl = `https://www.alphavantage.co/query?${params.toString()}`;
      
      const response = await fetch(testUrl);
      
      if (!response.ok) {

        return false;
      }
      
      const data = await response.json();
      
      if (data['Error Message']) {

        return false;
      }
      
      if (data['Note']) {

        return false;
      }
      
      const success = !!data['Global Quote'];

      return success;
      
    } catch (error) {
      console.error('❌ Alpha Vantage connection test failed:', error);
      return false;
    }
  }
}