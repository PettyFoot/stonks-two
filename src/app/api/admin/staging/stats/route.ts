import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/requireAdmin';
import { OrderStagingService } from '@/lib/services/OrderStagingService';
import { FormatApprovalService } from '@/lib/services/FormatApprovalService';
import { z } from 'zod';

const QuerySchema = z.object({
  timeframe: z.enum(['day', 'week', 'month']).default('week')
});

/**
 * GET /api/admin/staging/stats
 * Get staging and approval statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) {
      return adminResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const validation = QuerySchema.safeParse({
      timeframe: searchParams.get('timeframe')
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { timeframe } = validation.data;

    // Get stats from both services
    const stagingService = new OrderStagingService();
    const approvalService = new FormatApprovalService();

    const [stagingStats, approvalStats] = await Promise.all([
      stagingService.getAdminStagingStats(),
      approvalService.getApprovalStats(timeframe)
    ]);

    // Combine and format statistics
    const combinedStats = {
      staging: {
        totalPending: stagingStats.totalPending,
        formatsPendingApproval: stagingStats.formatsPendingApproval,
        oldestPendingDate: stagingStats.oldestPendingDate,
        formatDetails: stagingStats.formatDetails
      },
      approvals: {
        approvedFormats: approvalStats.approvedFormats,
        pendingFormats: approvalStats.pendingFormats,
        rejectedOrders: approvalStats.rejectedOrders,
        migratedOrders: approvalStats.migratedOrders,
        timeframe: approvalStats.timeframe
      },
      summary: {
        totalPendingOrders: stagingStats.totalPending,
        totalPendingFormats: stagingStats.formatsPendingApproval,
        recentApprovals: approvalStats.approvedFormats,
        recentMigrations: approvalStats.migratedOrders,
        waitTime: stagingStats.oldestPendingDate
          ? Math.floor((Date.now() - new Date(stagingStats.oldestPendingDate).getTime()) / (1000 * 60 * 60))
          : 0 // Hours
      }
    };

    return NextResponse.json({
      success: true,
      stats: combinedStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Admin staging stats error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get staging statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}