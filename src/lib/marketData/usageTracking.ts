import { RateLimitInfo, ApiUsageTrackingOptions } from './types';
import { PrismaClient } from '@prisma/client';

// Global Prisma client for database operations
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Use global client or create new one (prevents hot reload issues in development)
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV === 'development') global.__prisma = prisma;

/**
 * MarketDataUsageTracker - Handles API usage tracking and rate limiting
 * 
 * Features:
 * - Track API calls per user per provider
 * - Rate limiting based on subscription tier
 * - 30-minute rolling window for free users
 * - Unlimited access for premium users
 */
export class MarketDataUsageTracker {
  constructor() {
    // Using global Prisma client for database operations
  }

  /**
   * Check if a user can make an API call based on their rate limits
   * Now checks ALL providers (not provider-specific)
   */
  async canMakeApiCall(userId: string): Promise<RateLimitInfo> {
    try {
      // Call the database function with just user ID (no provider filter)
      const result = await prisma.$queryRaw`
        SELECT * FROM can_make_api_call(${userId})
      ` as any[];
      
      if (!result || result.length === 0) {
        throw new Error('No user found or database error');
      }

      const { allowed, calls_made, calls_remaining, reset_time, subscription_tier } = result[0];

      return {
        allowed: allowed as boolean,
        callsMade: calls_made as number,
        callsRemaining: calls_remaining as number | null,
        resetAt: new Date(reset_time as string),
        subscriptionTier: subscription_tier as 'FREE' | 'PREMIUM'
      };

    } catch (error) {
      console.error('Error checking API rate limit:', error);
      
      // Fail safe: allow the call but log the error
      return {
        allowed: true,
        callsMade: 0,
        callsRemaining: null,
        resetAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        subscriptionTier: 'FREE'
      };
    }
  }

  /**
   * Record an API call for usage tracking and rate limiting
   */
  async recordApiCall(
    userId: string,
    options: ApiUsageTrackingOptions,
    responseData?: {
      statusCode?: number;
      responseTimeMs?: number;
      responseSizeBytes?: number;
      errorMessage?: string;
    }
  ): Promise<string> {
    try {
      const result = await prisma.$queryRaw`
        SELECT record_api_call(
          ${userId},
          ${options.endpoint},
          ${options.method || 'GET'},
          ${options.requestParams ? JSON.stringify(options.requestParams) : null}::jsonb,
          ${responseData?.statusCode || 200}::integer,
          ${responseData?.responseTimeMs || null}::integer,
          ${responseData?.responseSizeBytes || null}::integer,
          ${responseData?.errorMessage || null}::text,
          ${options.provider}
        )
      ` as any[];

      return result[0]?.record_api_call || 'unknown';

    } catch (error) {
      console.error('Error recording API call:', error);
      return 'error';
    }
  }

  /**
   * Get usage statistics for a user (ALL providers combined)
   */
  async getUserUsageStats(
    userId: string,
    timeWindowMinutes: number = 30
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
    mostUsedEndpoint: string;
    lastCallTime: Date | null;
  }> {
    try {
      // Get usage statistics across ALL providers
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE response_status_code < 400) as successful_calls,
          COUNT(*) FILTER (WHERE is_error = true) as failed_calls,
          AVG(response_time_ms) as avg_response_time,
          MAX(timestamp) as last_call_time,
          (
            SELECT endpoint 
            FROM api_usage au2 
            WHERE au2.user_id = ${userId}
              AND au2.timestamp > (NOW() - INTERVAL '${timeWindowMinutes} minutes')
            GROUP BY endpoint 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
          ) as most_used_endpoint
        FROM api_usage 
        WHERE user_id = ${userId}
          AND timestamp > (NOW() - INTERVAL '${timeWindowMinutes} minutes')
      ` as any[];

      const stats = result[0] || {};

      return {
        totalCalls: parseInt(stats.total_calls) || 0,
        successfulCalls: parseInt(stats.successful_calls) || 0,
        failedCalls: parseInt(stats.failed_calls) || 0,
        averageResponseTime: parseFloat(stats.avg_response_time) || 0,
        mostUsedEndpoint: stats.most_used_endpoint || 'none',
        lastCallTime: stats.last_call_time ? new Date(stats.last_call_time) : null
      };

    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        mostUsedEndpoint: 'none',
        lastCallTime: null
      };
    }
  }

  /**
   * Clean up old usage records (called periodically)
   */
  async cleanupOldRecords(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT cleanup_old_api_usage()`;
      console.log('🧹 API usage cleanup completed');
    } catch (error) {
      console.error('Error cleaning up old API usage records:', error);
    }
  }
}

/**
 * Singleton instance for use across the application
 */
export const marketDataUsageTracker = new MarketDataUsageTracker();

/**
 * Helper function to check if a user can make an API call
 * This is the main function that should be used throughout the app
 * Now checks ALL providers (not provider-specific)
 */
export async function checkApiRateLimit(userId: string): Promise<RateLimitInfo> {
  return marketDataUsageTracker.canMakeApiCall(userId);
}

/**
 * Helper function to record an API call
 */
export async function recordMarketDataApiCall(
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
  try {
    await marketDataUsageTracker.recordApiCall(
      userId,
      { provider, endpoint },
      responseData
    );
  } catch (error) {
    console.error('Failed to record API call:', error);
    // Don't throw - we don't want tracking failures to break the main functionality
  }
}

/**
 * Middleware-style function for API rate limiting
 * Returns whether the request should be allowed to proceed
 * Now checks ALL providers (not provider-specific)
 */
export async function enforceApiRateLimit(
  userId: string
): Promise<{ allowed: boolean; rateLimitInfo: RateLimitInfo }> {
  const rateLimitInfo = await checkApiRateLimit(userId);
  
  return {
    allowed: rateLimitInfo.allowed,
    rateLimitInfo
  };
}