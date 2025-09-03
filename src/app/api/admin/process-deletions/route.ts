import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { accountDeletionService } from '@/lib/services/accountDeletion';

/**
 * POST /api/admin/process-deletions
 * Manually trigger account deletion processing (admin only)
 * 
 * This endpoint allows manual triggering of the deletion processing
 * that would normally run as a scheduled job.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // In a real app, you'd check if user is admin
    // For demo purposes, allowing any authenticated user
    if (process.env.NODE_ENV === 'production') {
      // Add admin check here
      // if (!isAdmin(user)) {
      //   return NextResponse.json(
      //     { error: 'Admin access required' },
      //     { status: 403 }
      //   );
      // }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/admin/process-deletions - User: ${user.id}`);
    }

    // Process scheduled deletions
    await accountDeletionService.scheduleBackgroundJobs();

    const response = {
      success: true,
      message: 'Account deletion processing completed',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          queryTime: Date.now() - startTime,
          triggeredBy: user.id,
        }
      })
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST /api/admin/process-deletions completed in ${Date.now() - startTime}ms`);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] POST /api/admin/process-deletions error:', error);
    
    const errorResponse = {
      error: 'Failed to process account deletions',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/admin/process-deletions
 * Get deletion processing status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // In production, add admin check here

    // Get statistics about pending deletions
    const { prisma } = await import('@/lib/prisma');
    
    const stats = await prisma.$transaction(async (tx) => {
      const usersWithDeletionRequest = await tx.user.count({
        where: {
          deletionRequestedAt: { not: null },
          deletedAt: null
        }
      });

      const usersNeedingSoftDelete = await tx.user.count({
        where: {
          deletionRequestedAt: { 
            not: null,
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          },
          deletedAt: null
        }
      });

      const usersNeedingAnonymization = await tx.user.count({
        where: {
          deletedAt: { 
            not: null,
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          },
          anonymizedAt: null
        }
      });

      const usersNeedingHardDelete = await tx.user.count({
        where: {
          finalDeletionAt: {
            not: null,
            lte: new Date() // Past the final deletion date
          }
        }
      });

      const recentDeletionLogs = await tx.accountDeletionLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          action: true,
          createdAt: true,
          completedAt: true,
          userEmail: true,
        }
      });

      return {
        usersWithDeletionRequest,
        usersNeedingSoftDelete,
        usersNeedingAnonymization,
        usersNeedingHardDelete,
        recentLogs: recentDeletionLogs
      };
    });

    const response = {
      statistics: {
        pendingDeletions: stats.usersWithDeletionRequest,
        needingSoftDelete: stats.usersNeedingSoftDelete,
        needingAnonymization: stats.usersNeedingAnonymization,
        needingHardDelete: stats.usersNeedingHardDelete,
      },
      recentActivity: stats.recentLogs,
      nextScheduledRun: 'Configure via cron job',
      recommendations: {
        runNow: stats.usersNeedingSoftDelete > 0 || 
                stats.usersNeedingAnonymization > 0 || 
                stats.usersNeedingHardDelete > 0,
        totalPendingOperations: stats.usersNeedingSoftDelete + 
                               stats.usersNeedingAnonymization + 
                               stats.usersNeedingHardDelete
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API] GET /api/admin/process-deletions error:', error);
    return NextResponse.json(
      { error: 'Failed to get deletion statistics' },
      { status: 500 }
    );
  }
}

// Only allow GET and POST methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to trigger processing or GET for statistics.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to trigger processing or GET for statistics.' },
    { status: 405 }
  );
}