import { prisma } from '@/lib/prisma';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  total: number;
}

export interface SyncStats {
  manualSyncsToday: number;
  lastSyncAt: Date | null;
  nextResetTime: Date;
}

/**
 * Rate limiter for SnapTrade manual syncs (5 per day)
 */
export class SnapTradeSyncRateLimiter {
  private static readonly DAILY_LIMIT = 5;

  /**
   * Check if user can perform a manual sync
   */
  static async checkManualSyncLimit(userId: string): Promise<RateLimitResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rateLimit = await prisma.syncRateLimit.upsert({
      where: {
        userId_date: { 
          userId, 
          date: today 
        }
      },
      update: {}, // Don't update if exists
      create: {
        userId,
        date: today,
        manualSyncCount: 0
      }
    });

    const remaining = this.DAILY_LIMIT - rateLimit.manualSyncCount;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      resetTime: tomorrow,
      total: this.DAILY_LIMIT
    };
  }

  /**
   * Increment the manual sync counter
   */
  static async incrementManualSyncCount(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.syncRateLimit.upsert({
      where: {
        userId_date: { 
          userId, 
          date: today 
        }
      },
      update: {
        manualSyncCount: { increment: 1 },
        lastSyncAt: new Date()
      },
      create: {
        userId,
        date: today,
        manualSyncCount: 1,
        lastSyncAt: new Date()
      }
    });
  }

  /**
   * Get sync statistics for a user
   */
  static async getSyncStats(userId: string): Promise<SyncStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rateLimit = await prisma.syncRateLimit.findUnique({
      where: {
        userId_date: { 
          userId, 
          date: today 
        }
      }
    });

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      manualSyncsToday: rateLimit?.manualSyncCount || 0,
      lastSyncAt: rateLimit?.lastSyncAt || null,
      nextResetTime: tomorrow
    };
  }

  /**
   * Reset rate limit for a user (admin function)
   */
  static async resetUserRateLimit(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.syncRateLimit.upsert({
      where: {
        userId_date: { 
          userId, 
          date: today 
        }
      },
      update: {
        manualSyncCount: 0,
        lastSyncAt: null
      },
      create: {
        userId,
        date: today,
        manualSyncCount: 0
      }
    });
  }

  /**
   * Clean up old rate limit entries (older than 30 days)
   */
  static async cleanupOldEntries(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const result = await prisma.syncRateLimit.deleteMany({
      where: {
        date: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * Get rate limit status for multiple users (admin function)
   */
  static async getBulkRateLimitStatus(userIds: string[]): Promise<Map<string, RateLimitResult>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rateLimits = await prisma.syncRateLimit.findMany({
      where: {
        userId: { in: userIds },
        date: today
      }
    });

    const results = new Map<string, RateLimitResult>();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const userId of userIds) {
      const rateLimit = rateLimits.find(rl => rl.userId === userId);
      const manualSyncCount = rateLimit?.manualSyncCount || 0;
      const remaining = this.DAILY_LIMIT - manualSyncCount;

      results.set(userId, {
        allowed: remaining > 0,
        remaining: Math.max(0, remaining),
        resetTime: tomorrow,
        total: this.DAILY_LIMIT
      });
    }

    return results;
  }
}

/**
 * Middleware-friendly rate limit check function
 */
export async function checkSnapTradeSyncRateLimit(userId: string): Promise<{
  success: boolean;
  error?: string;
  rateLimitInfo?: RateLimitResult;
}> {
  try {
    const rateLimitResult = await SnapTradeSyncRateLimiter.checkManualSyncLimit(userId);
    
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: `Daily sync limit reached (${rateLimitResult.total} per day). Resets at midnight.`,
        rateLimitInfo: rateLimitResult
      };
    }

    return {
      success: true,
      rateLimitInfo: rateLimitResult
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return {
      success: false,
      error: 'Rate limit check failed'
    };
  }
}