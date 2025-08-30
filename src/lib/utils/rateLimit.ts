// Simple in-memory rate limiting for development
// In production, you would use Redis or a similar store

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limiting implementation
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
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupExpiredEntries(now);
  }

  if (!entry) {
    // First request for this key
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (now > entry.resetTime) {
    // Window has expired, reset counter
    rateLimitStore.set(key, {
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
  rateLimitStore.set(key, entry);
  return true;
}

/**
 * Get rate limit status for a key
 */
export async function getRateLimitStatus(key: string): Promise<{
  requests: number;
  resetTime: number;
  remaining: number;
  maxRequests: number;
} | null> {
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return null;
  }

  const now = Date.now();
  
  if (now > entry.resetTime) {
    // Entry has expired
    rateLimitStore.delete(key);
    return null;
  }

  return {
    requests: entry.count,
    resetTime: entry.resetTime,
    remaining: Math.max(0, entry.resetTime - now),
    maxRequests: 0, // This would need to be tracked separately
  };
}

/**
 * Clear rate limit for a key
 */
export async function clearRateLimit(key: string): Promise<void> {
  rateLimitStore.delete(key);
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(now: number): void {
  const expiredKeys: string[] = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => rateLimitStore.delete(key));
  
  if (expiredKeys.length > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[RATE_LIMIT] Cleaned up ${expiredKeys.length} expired entries`);
  }
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
      const status = await getRateLimitStatus(key);
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