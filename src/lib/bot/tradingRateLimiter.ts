import { Redis } from '@upstash/redis';

/**
 * Trading Rate Limiter for SnapTrade API
 *
 * Enforces SnapTrade's rate limits:
 * - 1 trade per second per account (most critical for trading)
 * - 250 requests per minute global limit
 *
 * This is critical for preventing API rate limit errors during trading
 */
export class TradingRateLimiter {
  private redis: Redis;
  private static instance: TradingRateLimiter;

  private constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
  }

  static getInstance(): TradingRateLimiter {
    if (!TradingRateLimiter.instance) {
      TradingRateLimiter.instance = new TradingRateLimiter();
    }
    return TradingRateLimiter.instance;
  }

  /**
   * Check if we can place a trade for this account
   * SnapTrade limit: 1 trade per second per account
   */
  async canTrade(accountId: string): Promise<{
    allowed: boolean;
    waitTimeMs?: number;
  }> {
    const key = `snaptrade:trade:${accountId}`;
    const lastTradeTime = await this.redis.get(key);

    if (lastTradeTime) {
      const timeSinceLastTrade = Date.now() - parseInt(lastTradeTime as string);

      if (timeSinceLastTrade < 1000) {
        // Less than 1 second since last trade
        const waitTime = 1000 - timeSinceLastTrade;
        console.log(`[RATE_LIMITER] Trade rate limit for account ${accountId}: wait ${waitTime}ms`);

        return {
          allowed: false,
          waitTimeMs: waitTime
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record that a trade was made for this account
   */
  async recordTrade(accountId: string): Promise<void> {
    const key = `snaptrade:trade:${accountId}`;
    await this.redis.set(key, Date.now().toString(), { ex: 2 }); // 2 second expiry

    console.log(`[RATE_LIMITER] Recorded trade for account ${accountId}`);
  }

  /**
   * Check global API rate limit
   * SnapTrade limit: 250 requests per minute
   */
  async checkGlobalLimit(): Promise<{
    allowed: boolean;
    requestsRemaining?: number;
  }> {
    const key = 'snaptrade:requests';
    const currentCount = await this.redis.get(key);

    if (currentCount && parseInt(currentCount as string) >= 240) {
      // Leave some buffer (240 instead of 250)
      console.warn(`[RATE_LIMITER] Approaching global rate limit: ${currentCount}/250`);

      return {
        allowed: false,
        requestsRemaining: 250 - parseInt(currentCount as string)
      };
    }

    return {
      allowed: true,
      requestsRemaining: 240 - (parseInt(currentCount as string) || 0)
    };
  }

  /**
   * Record an API request
   */
  async recordRequest(): Promise<void> {
    const key = 'snaptrade:requests';

    // Increment counter with 60 second expiry
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60);
    await pipeline.exec();
  }

  /**
   * Wait for trade rate limit if needed
   */
  async waitForTradeLimit(accountId: string): Promise<void> {
    const check = await this.canTrade(accountId);

    if (!check.allowed && check.waitTimeMs) {
      console.log(`[RATE_LIMITER] Waiting ${check.waitTimeMs}ms for trade rate limit...`);
      await new Promise(resolve => setTimeout(resolve, check.waitTimeMs!));
    }
  }

  /**
   * Get rate limit status for monitoring
   */
  async getRateLimitStatus(accountId: string): Promise<{
    canTrade: boolean;
    globalRequestsRemaining: number;
    lastTradeTime?: number;
    waitTimeMs?: number;
  }> {
    const [tradeCheck, globalCheck] = await Promise.all([
      this.canTrade(accountId),
      this.checkGlobalLimit()
    ]);

    const lastTradeKey = `snaptrade:trade:${accountId}`;
    const lastTradeTime = await this.redis.get(lastTradeKey);

    return {
      canTrade: tradeCheck.allowed,
      globalRequestsRemaining: globalCheck.requestsRemaining || 0,
      lastTradeTime: lastTradeTime ? parseInt(lastTradeTime as string) : undefined,
      waitTimeMs: tradeCheck.waitTimeMs
    };
  }

  /**
   * Reset rate limits (for testing or emergency)
   */
  async resetLimits(accountId?: string): Promise<void> {
    if (accountId) {
      await this.redis.del(`snaptrade:trade:${accountId}`);
      console.log(`[RATE_LIMITER] Reset trade limits for account ${accountId}`);
    } else {
      await this.redis.del('snaptrade:requests');
      console.log('[RATE_LIMITER] Reset global rate limits');
    }
  }
}

// Export singleton instance
export const tradingRateLimiter = TradingRateLimiter.getInstance();

// Export convenience functions
export async function canTrade(accountId: string) {
  return await tradingRateLimiter.canTrade(accountId);
}

export async function recordTrade(accountId: string) {
  return await tradingRateLimiter.recordTrade(accountId);
}

export async function checkGlobalLimit() {
  return await tradingRateLimiter.checkGlobalLimit();
}

export async function recordRequest() {
  return await tradingRateLimiter.recordRequest();
}