import { NextRequest, NextResponse } from 'next/server';
import { OrderStagingService } from '@/lib/services/OrderStagingService';
import { StagingMonitor } from '@/lib/monitoring/StagingMonitor';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cron/cleanup-staging
 * Scheduled job to clean up expired staging records
 * Should be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Cleanup] Starting staging cleanup job');

    // Verify this is coming from a cron job (in production, you'd check API keys or IP)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    let totalDeleted = 0;
    const errors: string[] = [];

    try {
      // Clean up expired staging records
      const stagingService = new OrderStagingService();
      const deletedStaging = await stagingService.cleanupExpiredRecords();
      totalDeleted += deletedStaging;

      console.log(`[Cleanup] Deleted ${deletedStaging} expired staging records`);
    } catch (error) {
      const errorMsg = `Failed to cleanup staging records: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[Cleanup]', errorMsg);
      errors.push(errorMsg);
    }

    try {
      // Clean up old monitoring logs
      const { deletedStaging, deletedLogs } = await StagingMonitor.cleanupOldRecords();
      totalDeleted += deletedStaging + deletedLogs;

      console.log(`[Cleanup] Deleted ${deletedStaging} old staging records and ${deletedLogs} audit logs`);
    } catch (error) {
      const errorMsg = `Failed to cleanup monitoring records: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[Cleanup]', errorMsg);
      errors.push(errorMsg);
    }

    // Get health metrics after cleanup
    const healthMetrics = await StagingMonitor.getHealthMetrics();

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    // Record cleanup metrics
    await StagingMonitor.recordMetrics({
      operation: 'staging_cleanup',
      success,
      duration,
      recordCount: totalDeleted,
      errorRate: errors.length > 0 ? 1 : 0,
      timestamp: new Date()
    });

    console.log(`[Cleanup] Completed in ${duration}ms: ${totalDeleted} records deleted, ${errors.length} errors`);

    return NextResponse.json({
      success,
      duration,
      totalDeleted,
      errors: errors.length > 0 ? errors : undefined,
      healthMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Cleanup] Cleanup job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup job failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/cleanup-staging
 * Get cleanup job status and last run information
 */
export async function GET(request: NextRequest) {
  try {
    // Get health metrics
    const healthMetrics = await StagingMonitor.getHealthMetrics();

    // Get recent cleanup jobs from audit log
    const recentCleanups = await prisma.stagingAuditLog.findMany({
      where: {
        action: 'staging_cleanup',
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    const cleanupStats = {
      lastRun: recentCleanups[0]?.timestamp || null,
      totalRuns: recentCleanups.length,
      successRate: recentCleanups.length > 0
        ? recentCleanups.filter(r => (r.newState as any)?.success).length / recentCleanups.length
        : 0,
      avgDuration: recentCleanups.length > 0
        ? recentCleanups.reduce((sum, r) => sum + ((r.newState as any)?.duration || 0), 0) / recentCleanups.length
        : 0
    };

    return NextResponse.json({
      success: true,
      healthMetrics,
      cleanupStats,
      recentRuns: recentCleanups.map(r => ({
        timestamp: r.timestamp,
        success: (r.newState as any)?.success || false,
        duration: (r.newState as any)?.duration || 0,
        recordsDeleted: (r.newState as any)?.recordCount || 0
      }))
    });

  } catch (error) {
    console.error('[Cleanup] Failed to get cleanup status:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status'
      },
      { status: 500 }
    );
  }
}