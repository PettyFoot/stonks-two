import { Redis } from '@upstash/redis';
import { AnalyticsRequest, AnalyticsResponse } from '@/app/api/reports/analytics/route';

export class CacheService {
  private redis: Redis | null = null;
  private defaultTtl = 3600; // 1 hour
  private keyPrefix = 'stonks:analytics:';

  constructor() {
    // Initialize Redis connection only if environment variables are available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
      } catch (error) {
        console.warn('Redis initialization failed, caching disabled:', error);
        this.redis = null;
      }
    } else {
      console.warn('Redis environment variables not found, caching disabled');
    }
  }

  /**
   * Generate a deterministic cache key based on analytics request parameters
   */
  generateAnalyticsCacheKey(userId: string, request: AnalyticsRequest): string {
    const keyParts = [
      this.keyPrefix,
      userId,
      this.hashRequest(request)
    ];
    
    return keyParts.join(':');
  }

  /**
   * Store analytics result in cache
   */
  async setAnalytics(key: string, data: AnalyticsResponse, ttl?: number): Promise<void> {
    if (!this.redis) return; // Skip caching if Redis is not available
    
    try {
      await this.redis.setex(key, ttl || this.defaultTtl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
      // Don't throw - caching should be non-blocking
    }
  }

  /**
   * Retrieve analytics result from cache
   */
  async getAnalytics(key: string): Promise<AnalyticsResponse | null> {
    if (!this.redis) return null; // Skip caching if Redis is not available
    
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;
      
      return JSON.parse(cached as string) as AnalyticsResponse;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Invalidate analytics cache for a specific user
   */
  async invalidateUserAnalytics(userId: string): Promise<void> {
    if (!this.redis) return; // Skip if Redis is not available
    
    try {
      const pattern = `${this.keyPrefix}${userId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Store pre-computed aggregations for fast access
   */
  async setQuickStats(userId: string, stats: QuickStats): Promise<void> {
    if (!this.redis) return; // Skip if Redis is not available
    
    const key = `${this.keyPrefix}quick:${userId}`;
    try {
      await this.redis.setex(key, 300, JSON.stringify(stats)); // 5 min TTL for quick stats
    } catch (error) {
      console.error('Quick stats cache error:', error);
    }
  }

  /**
   * Get pre-computed quick stats
   */
  async getQuickStats(userId: string): Promise<QuickStats | null> {
    if (!this.redis) return null; // Skip if Redis is not available
    
    const key = `${this.keyPrefix}quick:${userId}`;
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached as string) : null;
    } catch (error) {
      console.error('Quick stats retrieval error:', error);
      return null;
    }
  }

  /**
   * Cache time-based aggregations with smart TTL
   */
  async setTimeAggregation(
    userId: string, 
    aggregationType: 'hourly' | 'daily' | 'weekly' | 'monthly',
    period: string,
    data: unknown
  ): Promise<void> {
    if (!this.redis) return; // Skip if Redis is not available
    
    const key = `${this.keyPrefix}time:${userId}:${aggregationType}:${period}`;
    
    // Smart TTL based on aggregation type
    const ttlMap = {
      hourly: 300,    // 5 minutes - more volatile
      daily: 1800,    // 30 minutes
      weekly: 3600,   // 1 hour
      monthly: 7200   // 2 hours - most stable
    };

    try {
      await this.redis.setex(key, ttlMap[aggregationType], JSON.stringify(data));
    } catch (error) {
      console.error('Time aggregation cache error:', error);
    }
  }

  /**
   * Get cached time aggregations
   */
  async getTimeAggregation(
    userId: string,
    aggregationType: 'hourly' | 'daily' | 'weekly' | 'monthly',
    period: string
  ): Promise<unknown | null> {
    if (!this.redis) return null; // Skip if Redis is not available
    
    const key = `${this.keyPrefix}time:${userId}:${aggregationType}:${period}`;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached as string) : null;
    } catch (error) {
      console.error('Time aggregation retrieval error:', error);
      return null;
    }
  }

  /**
   * Batch set multiple cache entries
   */
  async batchSet(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> {
    if (!this.redis) return; // Skip if Redis is not available
    
    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(({ key, value, ttl }) => {
        pipeline.setex(key, ttl || this.defaultTtl, JSON.stringify(value));
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Batch cache set error:', error);
    }
  }

  /**
   * Cache warmer for frequently accessed analytics
   */
  async warmCache(userId: string): Promise<void> {
    if (!this.redis) return; // Skip if Redis is not available
    
    try {
      // This would be called periodically or after trade updates
      // to pre-compute common analytics queries
      
      const _commonRequests: AnalyticsRequest[] = [
        // 30-day overview
        {
          dateRange: { preset: '30d' },
          aggregations: ['distribution', 'performance', 'statistics']
        },
        // 90-day performance
        {
          dateRange: { preset: '90d' },
          aggregations: ['performance', 'statistics']
        },
        // YTD summary
        {
          dateRange: { preset: 'ytd' },
          aggregations: ['statistics', 'time_analysis']
        }
      ];

      // This would trigger background computation
      // Implementation depends on your background job system
      console.log(`Cache warming initiated for user: ${userId}`);
      
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info();
      
      // Parse Redis info response
      const stats: CacheStats = {
        hitRate: 0, // Would need to implement hit/miss tracking
        totalKeys: 0,
        memoryUsage: 0,
        evictions: 0
      };

      // Parse info string to extract relevant metrics
      const lines = (info as string).split('\r\n');
      for (const line of lines) {
        if (line.startsWith('db0:keys=')) {
          stats.totalKeys = parseInt(line.split('=')[1].split(',')[0]);
        }
        if (line.startsWith('used_memory:')) {
          stats.memoryUsage = parseInt(line.split(':')[1]);
        }
        if (line.startsWith('evicted_keys:')) {
          stats.evictions = parseInt(line.split(':')[1]);
        }
      }

      return stats;
    } catch (error) {
      console.error('Cache stats error:', error);
      return { hitRate: 0, totalKeys: 0, memoryUsage: 0, evictions: 0 };
    }
  }

  /**
   * Hash request parameters for cache key generation
   */
  private hashRequest(request: AnalyticsRequest): string {
    // Create a deterministic hash of request parameters
    const normalized = {
      dateRange: request.dateRange,
      filters: {
        symbols: request.filters?.symbols?.sort(),
        tags: request.filters?.tags?.sort(),
        side: request.filters?.side,
        timeZone: request.filters?.timeZone || 'America/New_York'
      },
      aggregations: request.aggregations.sort()
    };

    // Simple hash implementation (consider using crypto.createHash for production)
    return Buffer.from(JSON.stringify(normalized)).toString('base64');
  }
}

export interface QuickStats {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  todayPnl: number;
  thisWeekPnl: number;
  thisMonthPnl: number;
  lastUpdated: string;
}

export interface CacheStats {
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictions: number;
}

// Singleton instance for app-wide use
export const cacheService = new CacheService();