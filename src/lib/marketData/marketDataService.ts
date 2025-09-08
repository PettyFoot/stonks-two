import { MarketDataProvider, MarketDataResponse, TimeWindow, TradeContext, MarketDataConfig, CacheEntry } from './types';
import { TimeInterval } from '../timeIntervals';
import { AlphaVantageProvider } from './providers/alphaVantageProvider';
import { DemoProvider } from './providers/demoProvider';
import { TimeWindowCalculator } from './timeWindowCalculator';

/**
 * Main market data service that orchestrates data fetching from multiple providers
 */
export class MarketDataService {
  private providers: MarketDataProvider[] = [];
  private config: MarketDataConfig;
  private cache = new Map<string, CacheEntry>();
  
  constructor(config?: Partial<MarketDataConfig>) {
    // Default configuration
    this.config = {
      cacheEnabled: true,
      cacheExpiryHours: 24,
      fallbackToMock: false,
      preferredInterval: '5m',
      maxRetries: 2,
      ...config
    };
    
    // Initialize providers in priority order
    this.initializeProviders();
  }
  
  /**
   * Initialize data providers in order of preference
   */
  private initializeProviders() {
    // Use Alpha Vantage as the only real data provider
    const alphaVantage = new AlphaVantageProvider();
    if (alphaVantage.isAvailable()) {
      this.providers.push(alphaVantage);
      console.log('Alpha Vantage provider initialized (20+ years of historical data)');
    } else {
      console.log('Alpha Vantage provider not available (no API key)');
    }
    
    // Final fallback to demo data (if enabled)
    if (this.config.fallbackToMock) {
      this.providers.push(new DemoProvider());
    }
  }
  
  /**
   * Main method to fetch market data for a trade
   */
  async fetchMarketData(tradeContext: TradeContext, interval?: string): Promise<MarketDataResponse> {
    try {
      // Calculate optimal time window
      const timeWindow = interval 
        ? TimeWindowCalculator.calculateWindowForInterval(tradeContext, interval as '1m' | '5m' | '15m' | '1h' | '1d')
        : TimeWindowCalculator.calculateOptimalWindow(tradeContext);
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(tradeContext.symbol, timeWindow);
      
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return {
            ...cached,
            cached: true
          };
        }
      }
      
      // Try providers in order
      let lastError: Error | null = null;
      
      for (const provider of this.providers) {
        if (!provider.isAvailable()) continue;
        
        try {
          console.log(`Attempting to fetch ${tradeContext.symbol} data from ${provider.name}`);
          
          const ohlcData = await provider.fetchOHLC(
            tradeContext.symbol,
            timeWindow,
            tradeContext
          );
          
          if (ohlcData && ohlcData.length > 0) {
            const response: MarketDataResponse = {
              symbol: tradeContext.symbol,
              date: tradeContext.date,
              interval: timeWindow.interval,
              ohlc: ohlcData,
              success: true,
              source: provider.name.toLowerCase().includes('alpha') ? 'alpha_vantage' as const : 'mock' as const,
              cached: false
            };
            
            // Cache successful response
            if (this.config.cacheEnabled) {
              this.saveToCache(cacheKey, response);
            }
            
            console.log(`Successfully fetched ${ohlcData.length} candles from ${provider.name}`);
            return response;
          }
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`${provider.name} failed:`, error);
          // Continue to next provider
        }
      }
      
      // If we get here, all providers failed
      throw lastError || new Error('All market data providers failed');
      
    } catch (error) {
      console.error('Market data service error:', error);
      
      return {
        symbol: tradeContext.symbol,
        date: tradeContext.date,
        interval: interval || this.config.preferredInterval,
        ohlc: [],
        success: false,
        error: error instanceof Error ? error.message : 'Market data not available',
        source: 'alpha_vantage',
        cached: false
      };
    }
  }
  
  /**
   * Generate cache key for market data request
   */
  private generateCacheKey(symbol: string, timeWindow: TimeWindow): string {
    const startDate = timeWindow.start.toISOString().split('T')[0];
    const endDate = timeWindow.end.toISOString().split('T')[0];
    return `ohlc_${symbol}_${startDate}_${endDate}_${timeWindow.interval}`;
  }
  
  /**
   * Get data from cache if not expired
   */
  private getFromCache(key: string): MarketDataResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Check if expired
    const expiryTime = cached.timestamp + (this.config.cacheExpiryHours * 60 * 60 * 1000);
    if (Date.now() > expiryTime) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Save data to cache
   */
  private saveToCache(key: string, data: MarketDataResponse): void {
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      expires: timestamp + (this.config.cacheExpiryHours * 60 * 60 * 1000),
      source: data.source
    });
  }
  
  /**
   * Clear cache (useful for testing or forcing fresh data)
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache stats
   */
  getCacheStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    const expiryMs = this.config.cacheExpiryHours * 60 * 60 * 1000;
    
    const expired = entries.filter(([_, entry]) => 
      now > entry.timestamp + expiryMs
    ).length;
    
    return {
      total: entries.length,
      expired,
      valid: entries.length - expired,
      size: JSON.stringify(entries).length // Rough size estimate
    };
  }
  
  /**
   * Test provider availability
   */
  async testProviders(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const provider of this.providers) {
      try {
        if ('testConnection' in provider && typeof provider.testConnection === 'function') {
          results[provider.name] = await provider.testConnection();
        } else {
          results[provider.name] = provider.isAvailable();
        }
      } catch (error) {
        results[provider.name] = false;
      }
    }
    
    return results;
  }
  
  /**
   * Get provider information
   */
  getProviderInfo() {
    return this.providers.map(provider => ({
      name: provider.name,
      available: provider.isAvailable(),
      rateLimits: 'getRateLimitInfo' in provider ? 
        (provider as MarketDataProvider & { getRateLimitInfo?: () => unknown }).getRateLimitInfo?.() || null : null
    }));
  }
}

// Singleton instance for use across the application
export const marketDataService = new MarketDataService();