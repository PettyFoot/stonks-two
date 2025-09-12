import { prisma } from '@/lib/prisma';
import { SubscriptionTier } from '@prisma/client';

// Upload limits by subscription tier
export const UPLOAD_LIMITS = {
  [SubscriptionTier.FREE]: 5,      // 5 uploads per day for free tier
  [SubscriptionTier.PREMIUM]: -1,  // Unlimited for premium tier
} as const;

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  isUnlimited: boolean;
}

/**
 * Check if a user can upload based on their subscription tier and daily limits
 */
export async function checkUploadLimit(userId: string): Promise<RateLimitStatus> {
  // Get user's subscription tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const limit = UPLOAD_LIMITS[user.subscriptionTier];
  
  // Premium users have unlimited uploads
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      resetAt: getTomorrowMidnight(),
      isUnlimited: true,
    };
  }

  // Check today's upload count for free users
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const uploadCount = await prisma.dailyUploadCount.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  const currentCount = uploadCount?.count || 0;
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed: currentCount < limit,
    remaining,
    limit,
    resetAt: getTomorrowMidnight(),
    isUnlimited: false,
  };
}

/**
 * Increment the upload count for a user (only for successful uploads)
 */
export async function incrementUploadCount(userId: string): Promise<void> {
  // Check if user is premium (no need to track for unlimited)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Don't track for premium users
  if (UPLOAD_LIMITS[user.subscriptionTier] === -1) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyUploadCount.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      count: { increment: 1 },
    },
    create: {
      userId,
      date: today,
      count: 1,
    },
  });
}

/**
 * Get the remaining upload count for a user
 */
export async function getRemainingUploads(userId: string): Promise<number> {
  const status = await checkUploadLimit(userId);
  return status.remaining;
}

/**
 * Reset upload count for a user (admin use only)
 */
export async function resetUploadCount(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyUploadCount.deleteMany({
    where: {
      userId,
      date: today,
    },
  });
}

/**
 * Get upload statistics for a user
 */
export async function getUploadStats(userId: string): Promise<{
  todayCount: number;
  weekCount: number;
  monthCount: number;
  subscriptionTier: SubscriptionTier;
  dailyLimit: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [todayCount, weekCounts, monthCounts] = await Promise.all([
    // Today's count
    prisma.dailyUploadCount.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      select: { count: true },
    }),
    // Week count
    prisma.dailyUploadCount.aggregate({
      where: {
        userId,
        date: { gte: weekAgo },
      },
      _sum: { count: true },
    }),
    // Month count
    prisma.dailyUploadCount.aggregate({
      where: {
        userId,
        date: { gte: monthAgo },
      },
      _sum: { count: true },
    }),
  ]);

  return {
    todayCount: todayCount?.count || 0,
    weekCount: weekCounts._sum.count || 0,
    monthCount: monthCounts._sum.count || 0,
    subscriptionTier: user.subscriptionTier,
    dailyLimit: UPLOAD_LIMITS[user.subscriptionTier],
  };
}

/**
 * Get tomorrow at midnight in user's timezone
 */
function getTomorrowMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Clean up old upload count records (run daily via cron)
 */
export async function cleanupOldUploadCounts(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await prisma.dailyUploadCount.deleteMany({
    where: {
      date: { lt: thirtyDaysAgo },
    },
  });

  return result.count;
}