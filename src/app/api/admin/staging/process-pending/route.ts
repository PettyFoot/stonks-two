import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { FormatApprovalService } from '@/lib/services/FormatApprovalService';
import { StagingMonitor } from '@/lib/monitoring/StagingMonitor';

/**
 * POST /api/admin/staging/process-pending
 * Manually process any staged orders for already-approved formats
 * This handles edge cases where migration might have failed during initial approval
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }
    const admin = adminResult;

    console.log(`[API] Admin ${admin.email} triggering manual staging processing`);

    const startTime = Date.now();
    const approvalService = new FormatApprovalService();

    // Process orphaned staging records
    const result = await approvalService.processOrphanedStagingRecords(admin.id);

    const duration = Date.now() - startTime;

    // Record monitoring metrics
    await StagingMonitor.recordMetrics({
      operation: 'manual_staging_process',
      success: result.success,
      duration,
      recordCount: result.processedCount,
      errorRate: result.errorCount > 0 ? result.errorCount / (result.processedCount + result.errorCount) : 0,
      timestamp: new Date()
    });

    console.log(
      `[API] Manual staging processing completed: ` +
      `${result.processedCount} processed, ${result.errorCount} errors, ${duration}ms`
    );

    return NextResponse.json({
      success: true,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      skippedCount: result.skippedCount,
      approvedFormatsChecked: result.approvedFormatsChecked,
      duration,
      errors: result.errors.length > 0 ? result.errors : undefined,
      message: result.processedCount > 0
        ? `Successfully processed ${result.processedCount} staged orders`
        : 'No staged orders found that need processing'
    });

  } catch (error) {
    console.error('[API] Manual staging processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Manual processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/staging/process-pending
 * Get count of pending staged orders for approved formats
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }

    const approvalService = new FormatApprovalService();
    const pendingStats = await approvalService.getPendingStagingStats();

    return NextResponse.json({
      success: true,
      pendingCount: pendingStats.pendingCount,
      approvedFormatsWithPending: pendingStats.approvedFormatsWithPending,
      oldestPendingHours: pendingStats.oldestPendingHours,
      needsProcessing: pendingStats.pendingCount > 0
    });

  } catch (error) {
    console.error('[API] Failed to get pending staging stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get pending stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}