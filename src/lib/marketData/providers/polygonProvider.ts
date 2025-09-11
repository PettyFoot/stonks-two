import { MarketDataProvider, OHLCData, TimeWindow, TradeContext } from '../types';

interface PolygonAggregateResult {
  o: number;   // Open price
  h: number;   // High price
  l: number;   // Low price
  c: number;   // Close price
  v: number;   // Volume
  vw: number;  // Volume weighted average price
  t: number;   // Unix Millisecond Timestamp
  n: number;   // Number of transactions in the aggregate window
}

interface PolygonAggregateResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results?: PolygonAggregateResult[];
  status: string;
  request_id: string;
  count: number;
}

/**
 * Polygon.io market data provider
 * Provides high-quality OHLCV data as fallback to Alpha Vantage
 */
export class PolygonProvider implements MarketDataProvider {
  name = 'Polygon.io';
  private baseUrl = 'https://api.polygon.io';

  constructor() {
    console.log('🟣 Polygon.io provider initialized');
  }

  /**
   * Check if Polygon API is available (API key configured)
   */
  isAvailable(): boolean {
    const apiKey = process.env.POLYGON_API_KEY;
    const enabled = process.env.POLYGON_ENABLED === 'true';
    return !!(apiKey && enabled);
  }

  /**
   * Fetch OHLC data from Polygon.io for a given symbol and time window
   */
  async fetchOHLC(
    symbol: string,
    timeWindow: TimeWindow,
    tradeContext?: TradeContext
  ): Promise<OHLCData[]> {
    if (!this.isAvailable()) {
      throw new Error('Polygon.io provider not available - API key not configured');
    }

    const apiKey = process.env.POLYGON_API_KEY!;

    try {
      // Convert our time window to Polygon format
      const { multiplier, timespan } = this.convertIntervalToPolygonFormat(timeWindow.interval);
      
      // Format dates for Polygon API (YYYY-MM-DD)
      const fromDate = this.formatDateForPolygon(timeWindow.start);
      const toDate = this.formatDateForPolygon(timeWindow.end);

      console.log(`🟣 Polygon API request:`, {
        symbol,
        multiplier,
        timespan,
        fromDate,
        toDate,
        interval: timeWindow.interval
      });

      // Build Polygon API URL
      // https://api.polygon.io/v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}`;
      
      const params = new URLSearchParams({
        adjusted: 'true',
        sort: 'asc',
        limit: '50000',
        apikey: apiKey
      });

      const fullUrl = `${url}?${params.toString()}`;

      console.log(`🟣 Fetching from Polygon: ${fullUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);

      const response = await fetch(fullUrl);

      if (!response.ok) {
        // Handle specific Polygon error responses
        if (response.status === 429) {
          throw new Error('POLYGON_RATE_LIMIT: Too many requests');
        } else if (response.status === 403) {
          throw new Error('POLYGON_UNAUTHORIZED: Invalid API key or insufficient permissions');
        } else if (response.status === 404) {
          throw new Error('POLYGON_NOT_FOUND: Symbol or data not found');
        }
        
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data: PolygonAggregateResponse = await response.json();

      console.log(`🟣 Polygon API response:`, {
        status: data.status,
        resultsCount: data.resultsCount,
        queryCount: data.queryCount,
        ticker: data.ticker,
        adjusted: data.adjusted,
        hasResults: !!data.results?.length
      });

      if (data.status !== 'OK') {
        throw new Error(`Polygon API returned status: ${data.status}`);
      }

      if (!data.results || data.results.length === 0) {
        console.warn(`🟣 No data returned from Polygon for ${symbol} on ${fromDate} to ${toDate}`);
        return [];
      }

      // Convert Polygon results to our OHLCData format
      const ohlcData = this.convertPolygonDataToOHLC(data.results);

      console.log(`🟣 Successfully converted ${ohlcData.length} candles from Polygon`, {
        symbol,
        dateRange: ohlcData.length > 0 ? {
          first: new Date(ohlcData[0].timestamp).toLocaleString(),
          last: new Date(ohlcData[ohlcData.length - 1].timestamp).toLocaleString()
        } : 'No data',
        sampleCandle: ohlcData[0] || null
      });

      return ohlcData;

    } catch (error) {
      console.error(`🟣 Polygon provider error for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Convert our interval format to Polygon's multiplier/timespan format
   */
  private convertIntervalToPolygonFormat(interval: string): { multiplier: number; timespan: string } {
    const intervalMap: Record<string, { multiplier: number; timespan: string }> = {
      '1m': { multiplier: 1, timespan: 'minute' },
      '5m': { multiplier: 5, timespan: 'minute' },
      '15m': { multiplier: 15, timespan: 'minute' },
      '30m': { multiplier: 30, timespan: 'minute' },
      '1h': { multiplier: 1, timespan: 'hour' },
      '2h': { multiplier: 2, timespan: 'hour' },
      '4h': { multiplier: 4, timespan: 'hour' },
      '1d': { multiplier: 1, timespan: 'day' },
      '1w': { multiplier: 1, timespan: 'week' },
      '1M': { multiplier: 1, timespan: 'month' }
    };

    const result = intervalMap[interval];
    if (!result) {
      console.warn(`🟣 Unknown interval ${interval}, defaulting to 5-minute`);
      return { multiplier: 5, timespan: 'minute' };
    }

    return result;
  }

  /**
   * Format date for Polygon API (YYYY-MM-DD)
   * Use local date components to avoid timezone shift
   */
  private formatDateForPolygon(date: Date): string {
    // Use local date components to avoid timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert Polygon aggregate results to our OHLCData format
   */
  private convertPolygonDataToOHLC(results: PolygonAggregateResult[]): OHLCData[] {
    return results.map(result => ({
      timestamp: result.t, // Polygon provides Unix millisecond timestamp
      open: result.o,
      high: result.h,
      low: result.l,
      close: result.c,
      volume: result.v
    }));
  }

  /**
   * Test the connection to Polygon API
   */
  async testConnection(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const apiKey = process.env.POLYGON_API_KEY!;
      
      // Test with a simple market status call
      const url = `${this.baseUrl}/v1/marketstatus/now?apikey=${apiKey}`;
      const response = await fetch(url);
      
      if (response.ok) {
        console.log('🟣 Polygon connection test successful');
        return true;
      } else {
        console.warn('🟣 Polygon connection test failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('🟣 Polygon connection test error:', error);
      return false;
    }
  }

  /**
   * Get rate limit information for debugging
   */
  getRateLimitInfo() {
    return {
      provider: 'Polygon.io',
      tier: 'Premium ($29/month)',
      limits: {
        requestsPerMinute: 'Varies by plan',
        requestsPerDay: 'Varies by plan'
      },
      features: [
        'Real-time and historical data',
        'Extended hours data',
        'High accuracy OHLCV data',
        'Multiple timeframes'
      ]
    };
  }
}