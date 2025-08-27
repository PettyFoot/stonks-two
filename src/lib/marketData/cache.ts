import { MarketDataResponse, CacheEntry } from './types';

/**
 * Client-side cache for market data using localStorage
 */
export class MarketDataCache {
  private static readonly CACHE_PREFIX = 'stonks_market_data_';
  private static readonly CACHE_VERSION = 'v1';
  private static readonly DEFAULT_EXPIRY_HOURS = 24;
  
  /**
   * Generate cache key for market data
   */
  private static generateKey(
    symbol: string, 
    date: string, 
    interval: string,
    startTime?: string,
    endTime?: string
  ): string {
    const timeKey = startTime && endTime ? `_${startTime}_${endTime}` : '';
    return `${this.CACHE_PREFIX}${this.CACHE_VERSION}_${symbol}_${date}_${interval}${timeKey}`;
  }
  
  /**
   * Get cached market data
   */
  static get(
    symbol: string, 
    date: string, 
    interval: string,
    startTime?: string,
    endTime?: string
  ): MarketDataResponse | null {
    if (typeof window === 'undefined') return null; // Server-side check
    
    try {
      const key = this.generateKey(symbol, date, interval, startTime, endTime);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const cacheEntry: CacheEntry = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cacheEntry.expires) {
        localStorage.removeItem(key);
        return null;
      }
      
      // Return cached data with cache flag
      return {
        ...cacheEntry.data,
        cached: true
      };
      
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }
  
  /**
   * Store market data in cache
   */
  static set(
    data: MarketDataResponse,
    expiryHours: number = this.DEFAULT_EXPIRY_HOURS
  ): void {
    if (typeof window === 'undefined') return; // Server-side check
    
    try {
      const key = this.generateKey(data.symbol, data.date, data.interval);
      const expires = Date.now() + (expiryHours * 60 * 60 * 1000);
      
      const cacheEntry: CacheEntry = {
        data: { ...data, cached: false }, // Store without cache flag
        timestamp: Date.now(),
        expires,
        source: data.source
      };
      
      localStorage.setItem(key, JSON.stringify(cacheEntry));
      
      // Clean up old entries periodically
      this.cleanupExpired();
      
    } catch (error) {
      console.warn('Cache write error:', error);
      // If we can't cache (e.g., storage full), that's okay - just continue
    }
  }
  
  /**
   * Clear all market data cache
   */
  static clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }
  
  /**
   * Clear cache for specific symbol
   */
  static clearSymbol(symbol: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX) && key.includes(`_${symbol}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Symbol cache clear error:', error);
    }
  }
  
  /**
   * Clean up expired cache entries
   */
  private static cleanupExpired(): void {
    if (typeof window === 'undefined') return;
    
    // Only cleanup periodically to avoid performance impact
    const lastCleanup = localStorage.getItem(`${this.CACHE_PREFIX}last_cleanup`);
    const now = Date.now();
    
    if (lastCleanup && now - parseInt(lastCleanup) < 3600000) { // 1 hour
      return;
    }
    
    try {
      const keys = Object.keys(localStorage);
      let cleaned = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX) && key !== `${this.CACHE_PREFIX}last_cleanup`) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheEntry: CacheEntry = JSON.parse(cached);
              if (now > cacheEntry.expires) {
                localStorage.removeItem(key);
                cleaned++;
              }
            }
          } catch {
            // If we can't parse it, remove it
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      });
      
      localStorage.setItem(`${this.CACHE_PREFIX}last_cleanup`, now.toString());
      
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired cache entries`);
      }
      
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  static getStats(): {
    totalEntries: number;
    totalSize: string;
    expiredEntries: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    if (typeof window === 'undefined') {
      return {
        totalEntries: 0,
        totalSize: '0 KB',
        expiredEntries: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX) && key !== `${this.CACHE_PREFIX}last_cleanup`
      );
      
      let totalSize = 0;
      let expiredCount = 0;
      let oldestTime = Number.MAX_SAFE_INTEGER;
      let newestTime = 0;
      const now = Date.now();
      
      keys.forEach(key => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            const cacheEntry: CacheEntry = JSON.parse(cached);
            
            if (now > cacheEntry.expires) {
              expiredCount++;
            }
            
            if (cacheEntry.timestamp < oldestTime) {
              oldestTime = cacheEntry.timestamp;
            }
            
            if (cacheEntry.timestamp > newestTime) {
              newestTime = cacheEntry.timestamp;
            }
          }
        } catch {
          // Ignore parsing errors
        }
      });
      
      return {
        totalEntries: keys.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        expiredEntries: expiredCount,
        oldestEntry: oldestTime === Number.MAX_SAFE_INTEGER ? null : new Date(oldestTime).toISOString(),
        newestEntry: newestTime === 0 ? null : new Date(newestTime).toISOString()
      };
      
    } catch (error) {
      console.warn('Cache stats error:', error);
      return {
        totalEntries: 0,
        totalSize: '0 KB',
        expiredEntries: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }
  
  /**
   * Check if cache is available and working
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const testKey = `${this.CACHE_PREFIX}test`;
      localStorage.setItem(testKey, 'test');
      const result = localStorage.getItem(testKey) === 'test';
      localStorage.removeItem(testKey);
      return result;
    } catch {
      return false;
    }
  }
}