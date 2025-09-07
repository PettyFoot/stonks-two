import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { SnapTradeActivityProcessor } from '@/lib/snaptrade/activityProcessor';
import { SnapTradeSyncRateLimiter, checkSnapTradeSyncRateLimit } from '@/lib/snaptrade/rateLimiter';
import { prisma } from '@/lib/prisma';
import { SyncType, SyncStatus } from '@prisma/client';
import { z } from 'zod';

// Request schema validation
const syncRequestSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  connectionId: z.string().optional() // For future when we have multiple connections
});

const statusRequestSchema = z.object({
  syncId: z.string().optional()
});

/**
 * POST - Initiate manual SnapTrade activities import
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Check rate limit for manual syncs
    const rateLimitCheck = await checkSnapTradeSyncRateLimit(userId);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        error: rateLimitCheck.error,
        rateLimitInfo: rateLimitCheck.rateLimitInfo
      }, { status: 429 });
    }

    // Parse and validate request
    const body = await request.json();
    const { dateFrom, dateTo, connectionId } = syncRequestSchema.parse(body);

    // Set default date range (last 7 days)
    const dateFromObj = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateToObj = dateTo ? new Date(dateTo) : new Date();

    // Validate date range
    if (dateFromObj >= dateToObj) {
      return NextResponse.json({ 
        error: 'Invalid date range: dateFrom must be before dateTo' 
      }, { status: 400 });
    }

    // Check if user has SnapTrade connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        snapTradeUserId: true, 
        snapTradeUserSecret: true 
      }
    });

    if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) {
      return NextResponse.json({ 
        error: 'SnapTrade connection not found. Please connect your broker first.' 
      }, { status: 400 });
    }

    // Estimate activity count for UI planning
    const processor = new SnapTradeActivityProcessor();
    const estimatedCount = await processor.estimateActivityCount(
      connectionId || userId,
      userId,
      dateFromObj,
      dateToObj
    );

    // If large import (>100 activities), recommend using background processing
    if (estimatedCount > 100) {
      return NextResponse.json({
        status: 'estimate',
        estimatedCount,
        message: `Large import detected (${estimatedCount} estimated activities). This may take a while.`,
        recommendation: 'Consider narrowing the date range or proceed with background processing.',
        canProceed: true
      });
    }

    // Create sync log entry
    const syncLog = await prisma.snapTradeSync.create({
      data: {
        userId,
        connectionId: connectionId || userId,
        syncType: SyncType.MANUAL,
        status: SyncStatus.RUNNING,
      }
    });

    // Increment rate limit counter
    await SnapTradeSyncRateLimiter.incrementManualSyncCount(userId);

    // Process activities
    const result = await processor.processActivities(
      connectionId || userId,
      userId,
      {
        dateFrom: dateFromObj,
        dateTo: dateToObj,
        onProgress: (progress, message) => {
          // In a real implementation, you might want to store progress in database
          // or use websockets to send progress updates to the client
          console.log(`Sync ${syncLog.id}: ${progress}% - ${message}`);
        }
      }
    );

    // Update sync log
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: {
        status: result.success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        activitiesFound: result.activitiesFound,
        ordersCreated: result.ordersCreated,
        errors: result.errors.length > 0 ? result.errors : undefined,
        completedAt: new Date()
      }
    });

    // Get updated rate limit info
    const updatedRateLimitInfo = await SnapTradeSyncRateLimiter.checkManualSyncLimit(userId);

    return NextResponse.json({
      success: result.success,
      syncId: syncLog.id,
      activitiesFound: result.activitiesFound,
      ordersCreated: result.ordersCreated,
      duplicatesSkipped: result.duplicatesSkipped,
      errors: result.errors,
      dateRange: {
        from: dateFromObj.toISOString(),
        to: dateToObj.toISOString()
      },
      rateLimitInfo: updatedRateLimitInfo,
      message: result.success 
        ? `Successfully imported ${result.ordersCreated} orders from ${result.activitiesFound} activities`
        : `Import failed with ${result.errors.length} error(s)`
    });

  } catch (error) {
    console.error('SnapTrade activities import error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const { searchParams } = new URL(request.url);
    const syncId = searchParams.get('syncId');

    if (syncId) {
      // Get specific sync status
      const sync = await prisma.snapTradeSync.findFirst({
        where: {
          id: syncId,
          userId
        }
      });

      if (!sync) {
        return NextResponse.json({ error: 'Sync not found' }, { status: 404 });
      }

      return NextResponse.json({
        sync,
        isComplete: sync.status === SyncStatus.COMPLETED || sync.status === SyncStatus.FAILED,
        duration: sync.completedAt 
          ? sync.completedAt.getTime() - sync.startedAt.getTime()
          : null
      });
    }

    // Get sync history and status
    const [recentSyncs, rateLimitInfo, syncStats] = await Promise.all([
      prisma.snapTradeSync.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 10
      }),
      SnapTradeSyncRateLimiter.checkManualSyncLimit(userId),
      SnapTradeSyncRateLimiter.getSyncStats(userId)
    ]);

    // Check if user has SnapTrade connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        snapTradeUserId: true, 
        snapTradeUserSecret: true 
      }
    });

    const hasConnection = !!(user?.snapTradeUserId && user?.snapTradeUserSecret);

    return NextResponse.json({
      hasConnection,
      recentSyncs,
      rateLimitInfo,
      syncStats,
      canSync: hasConnection && rateLimitInfo.allowed
    });

  } catch (error) {
    console.error('SnapTrade sync status error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Disable caching for dynamic sync data
export const dynamic = 'force-dynamic';
export const revalidate = 0;