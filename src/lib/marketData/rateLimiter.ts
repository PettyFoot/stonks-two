import { RateLimitInfo } from './types';
import { checkApiRateLimit, recordMarketDataApiCall } from './usageTracking';

/**
 * Rate limit configurations per subscription tier
 */
const RATE_LIMITS = {
  FREE: {
    calls: 10,
    windowMinutes: 30,
    description: '10 calls per 30 minutes'
  },
  PREMIUM: {
    calls: Infinity,
    windowMinutes: null,
    description: 'Unlimited'
  }
} as const;

/**
 * Error class for rate limit exceeded scenarios
 */
export class RateLimitExceededError extends Error {
  constructor(
    public rateLimitInfo: RateLimitInfo,
    message?: string
  ) {
    super(message || `Rate limit exceeded. ${rateLimitInfo.callsMade} calls made, limit is ${rateLimitInfo.callsRemaining === null ? 'unlimited' : rateLimitInfo.callsMade + rateLimitInfo.callsRemaining!}.`);
    this.name = 'RateLimitExceededError';
  }
}

/**
 * MarketDataRateLimiter - Centralized rate limiting for market data APIs
 * 
 * Handles:
 * - Pre-request rate limit checking
 * - Post-request usage recording
 * - Error handling for rate limit scenarios
 * - User-friendly error messages
 */
export class MarketDataRateLimiter {
  /**
   * Check if a user can make an API call and throw an error if not
   * Now checks ALL providers (not provider-specific)
   */
  async enforceRateLimit(userId: string): Promise<RateLimitInfo> {
    const rateLimitInfo = await checkApiRateLimit(userId);

    if (!rateLimitInfo.allowed) {
      throw new RateLimitExceededError(
        rateLimitInfo,
        this.generateRateLimitErrorMessage(rateLimitInfo)
      );
    }

    return rateLimitInfo;
  }

  /**
   * Check rate limit without throwing (returns boolean)
   * Now checks ALL providers (not provider-specific)
   */
  async checkRateLimit(
    userId: string
  ): Promise<{ allowed: boolean; rateLimitInfo: RateLimitInfo }> {
    const rateLimitInfo = await checkApiRateLimit(userId);
    
    return {
      allowed: rateLimitInfo.allowed,
      rateLimitInfo
    };
  }

  /**
   * Record an API call after it's been made
   */
  async recordApiCall(
    userId: string,
    provider: string,
    endpoint: string,
    responseData?: {
      statusCode?: number;
      responseTimeMs?: number;
      responseSizeBytes?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    await recordMarketDataApiCall(userId, provider, endpoint, responseData);
  }

  /**
   * Wrapper function that combines rate limit checking and recording
   * Use this for most API call scenarios
   */
  async withRateLimit<T>(
    userId: string,
    provider: string,
    endpoint: string,
    apiCallFunction: () => Promise<T>
  ): Promise<T> {
    // Check rate limit before making the call (provider-agnostic now)
    const rateLimitInfo = await this.enforceRateLimit(userId);

    const startTime = Date.now();
    let responseStatusCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      const result = await apiCallFunction();
      responseStatusCode = 200; // Assume success if no error thrown
      return result;
    } catch (error) {
      responseStatusCode = error instanceof Error && 'status' in error ? 
        (error as any).status : 500;
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      // Record the API call regardless of success/failure
      const responseTimeMs = Date.now() - startTime;
      
      await this.recordApiCall(userId, provider, endpoint, {
        statusCode: responseStatusCode,
        responseTimeMs,
        errorMessage
      });
    }
  }

  /**
   * Generate user-friendly error messages for rate limit scenarios
   */
  private generateRateLimitErrorMessage(rateLimitInfo: RateLimitInfo): string {
    const { subscriptionTier, callsMade, resetAt } = rateLimitInfo;
    
    if (subscriptionTier === 'FREE') {
      const minutesUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / (1000 * 60));
      
      return [
        `You've reached your limit of 10 requests per 30 minutes.`,
        `You've made ${callsMade} requests.`,
        minutesUntilReset > 0 ? 
          `Try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.` :
          'You can make requests again now.',
        'Upgrade to Premium for unlimited access.'
      ].join(' ');
    }

    // This shouldn't happen for premium users, but just in case
    return `Rate limit exceeded. Please try again later.`;
  }

  /**
   * Get rate limit configuration for a subscription tier
   */
  getRateLimitConfig(tier: 'FREE' | 'PREMIUM') {
    return RATE_LIMITS[tier];
  }

  /**
   * Get user-friendly rate limit information
   */
  formatRateLimitInfo(rateLimitInfo: RateLimitInfo): string {
    const { subscriptionTier, callsMade, callsRemaining } = rateLimitInfo;
    
    if (subscriptionTier === 'PREMIUM') {
      return `Premium: Unlimited requests (${callsMade} made)`;
    }

    const remaining = callsRemaining || 0;
    return `Free: ${callsMade}/10 requests used, ${remaining} remaining`;
  }

  /**
   * Generate headers for HTTP responses with rate limit info
   */
  getRateLimitHeaders(rateLimitInfo: RateLimitInfo): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Tier': rateLimitInfo.subscriptionTier,
      'X-RateLimit-Calls-Made': rateLimitInfo.callsMade.toString(),
    };

    if (rateLimitInfo.subscriptionTier === 'FREE') {
      headers['X-RateLimit-Limit'] = '10';
      headers['X-RateLimit-Remaining'] = (rateLimitInfo.callsRemaining || 0).toString();
      headers['X-RateLimit-Reset'] = Math.ceil(rateLimitInfo.resetAt.getTime() / 1000).toString();
    }

    return headers;
  }
}

/**
 * Singleton instance for use across the application
 */
export const marketDataRateLimiter = new MarketDataRateLimiter();

/**
 * Convenience function for enforcing rate limits
 * This is the main function that should be used throughout the app
 * Now checks ALL providers (not provider-specific)
 */
export async function enforceMarketDataRateLimit(userId: string): Promise<RateLimitInfo> {
  return marketDataRateLimiter.enforceRateLimit(userId);
}

/**
 * Convenience function for checking rate limits without throwing
 * Now checks ALL providers (not provider-specific)
 */
export async function checkMarketDataRateLimit(
  userId: string
): Promise<{ allowed: boolean; rateLimitInfo: RateLimitInfo }> {
  return marketDataRateLimiter.checkRateLimit(userId);
}