import { Redis } from '@upstash/redis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Redis-based rate limiting with fallback to in-memory for development
class RateLimitService {
  private redis: Redis | null = null;
  private inMemoryStore = new Map<string, RateLimitEntry>();
  private keyPrefix = 'rate_limit:';

  constructor() {
    // Initialize Redis connection only if environment variables are available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
      } catch (error) {
        // Redis initialization failed, will use in-memory fallback
        this.redis = null;
      }
    }
  }

  async rateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const prefixedKey = this.keyPrefix + key;

    if (this.redis) {
      return this.rateLimitRedis(prefixedKey, maxRequests, windowMs);
    } else {
      return this.rateLimitInMemory(key, maxRequests, windowMs);
    }
  }

  private async rateLimitRedis(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis!.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

      // Set expiration on the key
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();

      // Get count after removing expired entries (index 1 in results)
      const currentCount = results[1] as number;

      return currentCount < maxRequests;
    } catch (error) {
      // If Redis fails, allow the request (fail open)
      return true;
    }
  }

  private async rateLimitInMemory(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const entry = this.inMemoryStore.get(key);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      this.cleanupExpiredEntries(now);
    }

    if (!entry) {
      // First request for this key
      this.inMemoryStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (now > entry.resetTime) {
      // Window has expired, reset counter
      this.inMemoryStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment counter
    entry.count++;
    this.inMemoryStore.set(key, entry);
    return true;
  }

  async getRateLimitStatus(key: string, maxRequests: number): Promise<{
    requests: number;
    resetTime: number;
    remaining: number;
    maxRequests: number;
  } | null> {
    const prefixedKey = this.keyPrefix + key;

    if (this.redis) {
      return this.getRateLimitStatusRedis(prefixedKey, maxRequests);
    } else {
      return this.getRateLimitStatusInMemory(key, maxRequests);
    }
  }

  private async getRateLimitStatusRedis(key: string, maxRequests: number): Promise<{
    requests: number;
    resetTime: number;
    remaining: number;
    maxRequests: number;
  } | null> {
    try {
      const count = await this.redis!.zcard(key);
      const ttl = await this.redis!.ttl(key);

      if (ttl <= 0) {
        return null;
      }

      const resetTime = Date.now() + (ttl * 1000);

      return {
        requests: count,
        resetTime,
        remaining: Math.max(0, maxRequests - count),
        maxRequests,
      };
    } catch (error) {
      return null;
    }
  }

  private async getRateLimitStatusInMemory(key: string, maxRequests: number): Promise<{
    requests: number;
    resetTime: number;
    remaining: number;
    maxRequests: number;
  } | null> {
    const entry = this.inMemoryStore.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();

    if (now > entry.resetTime) {
      // Entry has expired
      this.inMemoryStore.delete(key);
      return null;
    }

    return {
      requests: entry.count,
      resetTime: entry.resetTime,
      remaining: Math.max(0, maxRequests - entry.count),
      maxRequests,
    };
  }

  async clearRateLimit(key: string): Promise<void> {
    const prefixedKey = this.keyPrefix + key;

    if (this.redis) {
      try {
        await this.redis.del(prefixedKey);
      } catch (error) {
        // Ignore Redis errors
      }
    } else {
      this.inMemoryStore.delete(key);
    }
  }

  private cleanupExpiredEntries(now: number): void {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (now > entry.resetTime) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.inMemoryStore.delete(key));
  }
}

// Singleton instance
const rateLimitService = new RateLimitService();

/**
 * Production-ready rate limiting implementation with Redis support
 * @param key - Unique identifier (IP, user ID, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Promise<boolean> - true if request is allowed, false if rate limited
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  return rateLimitService.rateLimit(key, maxRequests, windowMs);
}

/**
 * Get rate limit status for a key
 */
export async function getRateLimitStatus(key: string, maxRequests: number): Promise<{
  requests: number;
  resetTime: number;
  remaining: number;
  maxRequests: number;
} | null> {
  return rateLimitService.getRateLimitStatus(key, maxRequests);
}

/**
 * Clear rate limit for a key
 */
export async function clearRateLimit(key: string): Promise<void> {
  return rateLimitService.clearRateLimit(key);
}

/**
 * Rate limit configurations for different API endpoints
 */
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  general: {
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later'
  },

  // Authentication endpoints
  auth: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts, please try again later'
  },

  // Subscription management (more restrictive)
  subscription: {
    max: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many subscription requests, please try again later'
  },

  // Payment endpoints (very restrictive)
  payment: {
    max: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many payment requests, please try again later'
  },

  // Data export (restrictive for free users)
  export: {
    max: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Export limit reached, please try again later or upgrade to Premium'
  },

  // Heavy operations (dashboard, analytics)
  heavy: {
    max: 30,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many requests for this resource, please try again later'
  },

  // User profile updates
  profile: {
    max: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many profile update requests, please try again later'
  }
};

/**
 * Create a rate limiter with specific config
 */
export function createRateLimiter(config: {
  max: number;
  windowMs: number;
  message?: string;
  keyGenerator?: (identifier: string) => string;
}) {
  return async function rateLimitCheck(identifier: string): Promise<{
    allowed: boolean;
    message?: string;
    resetTime?: number;
    remaining?: number;
  }> {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const allowed = await rateLimit(key, config.max, config.windowMs);

    if (!allowed) {
      const status = await getRateLimitStatus(key, config.max);
      return {
        allowed: false,
        message: config.message || 'Rate limit exceeded',
        resetTime: status?.resetTime,
        remaining: status?.remaining,
      };
    }

    return { allowed: true };
  };
}