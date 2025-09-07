import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { SnapTradeSyncRateLimiter } from '@/lib/snaptrade/rateLimiter';
import { prisma } from '@/lib/prisma';
import { SyncStatus } from '@prisma/client';

/**
 * GET - Get current sync status and rate limit info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Get rate limit status
    const rateLimitInfo = await SnapTradeSyncRateLimiter.checkManualSyncLimit(userId);
    const syncStats = await SnapTradeSyncRateLimiter.getSyncStats(userId);

    // Get current running sync if any
    const runningSyncs = await prisma.snapTradeSync.findMany({
      where: {
        userId,
        status: { in: [SyncStatus.PENDING, SyncStatus.RUNNING] }
      },
      orderBy: { startedAt: 'desc' },
      take: 1
    });

    // Get last completed sync
    const lastCompletedSync = await prisma.snapTradeSync.findFirst({
      where: {
        userId,
        status: { in: [SyncStatus.COMPLETED, SyncStatus.FAILED] }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Calculate next daily auto-sync time (1 AM next day)
    const now = new Date();
    const nextAutoSync = new Date();
    nextAutoSync.setDate(nextAutoSync.getDate() + 1);
    nextAutoSync.setHours(1, 0, 0, 0);

    // If it's already past 1 AM today, next sync is tomorrow
    if (now.getHours() >= 1) {
      nextAutoSync.setDate(nextAutoSync.getDate() + 1);
    }

    return NextResponse.json({
      // Rate limiting
      rateLimitInfo,
      syncStats,
      
      // Current sync status
      hasRunningSyncs: runningSyncs.length > 0,
      currentSync: runningSyncs[0] || null,
      lastSync: lastCompletedSync,
      
      // Auto-sync info
      nextAutoSyncAt: nextAutoSync.toISOString(),
      
      // Summary
      canManualSync: rateLimitInfo.allowed && runningSyncs.length === 0,
      syncsRemaining: rateLimitInfo.remaining,
      hoursUntilReset: Math.ceil((rateLimitInfo.resetTime.getTime() - now.getTime()) / (1000 * 60 * 60))
    });

  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Disable caching for real-time status
export const dynamic = 'force-dynamic';
export const revalidate = 0;