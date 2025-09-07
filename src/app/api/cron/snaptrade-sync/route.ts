import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SnapTradeActivityProcessor } from '@/lib/snaptrade/activityProcessor';
import { SyncType, SyncStatus } from '@prisma/client';

/**
 * Daily SnapTrade sync cron job
 * Runs at 1 AM daily to sync activities for all users with auto-sync enabled
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
    console.error('[CRON] Unauthorized cron request', { authHeader, hasSecret: !!process.env.CRON_SECRET });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log(`[SNAPTRADE_CRON] Starting daily SnapTrade sync at ${new Date().toISOString()}`);

  try {
    // Get all users with SnapTrade connections and auto-sync enabled
    const users = await prisma.user.findMany({
      where: {
        snapTradeUserId: { not: null },
        // You might want to add an autoSyncEnabled field to User model
        // autoSyncEnabled: true,
      },
      include: {
        // You'll need to add brokerConnections relation to User model
        // brokerConnections: {
        //   where: {
        //     status: 'ACTIVE',
        //     autoSyncEnabled: true
        //   }
        // }
      }
    });

    console.log(`[SNAPTRADE_CRON] Found ${users.length} users to sync`);

    const results = {
      totalUsers: users.length,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalActivities: 0,
      totalOrdersCreated: 0,
      errors: [] as string[]
    };

    const processor = new SnapTradeActivityProcessor();

    // Process each user
    for (const user of users) {
      try {
        console.log(`[SNAPTRADE_CRON] Processing user ${user.id}`);

        // Create sync log entry
        const syncLog = await prisma.snapTradeSync.create({
          data: {
            userId: user.id,
            connectionId: user.id, // Using user ID as connection ID for now
            syncType: SyncType.AUTOMATIC,
            status: SyncStatus.RUNNING,
          }
        });

        // Calculate date range (last 2 days to ensure we don't miss anything)
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 2);
        const dateTo = new Date();

        // Process activities
        const result = await processor.processActivities(
          user.id, // Using user ID as connection ID for now
          user.id,
          {
            dateFrom,
            dateTo,
            onProgress: (progress, message) => {
              console.log(`[SNAPTRADE_CRON] User ${user.id}: ${progress}% - ${message}`);
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

        if (result.success) {
          results.successfulSyncs++;
          results.totalActivities += result.activitiesFound;
          results.totalOrdersCreated += result.ordersCreated;
          console.log(`[SNAPTRADE_CRON] User ${user.id} sync completed: ${result.ordersCreated} orders created`);
        } else {
          results.failedSyncs++;
          results.errors.push(`User ${user.id}: ${result.errors.join(', ')}`);
          console.error(`[SNAPTRADE_CRON] User ${user.id} sync failed:`, result.errors);
        }

      } catch (error) {
        results.failedSyncs++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`User ${user.id}: ${errorMsg}`);
        console.error(`[SNAPTRADE_CRON] Failed to process user ${user.id}:`, error);

        // Update sync log with error
        await prisma.snapTradeSync.updateMany({
          where: {
            userId: user.id,
            status: SyncStatus.RUNNING,
            // Get the most recent running sync
            startedAt: {
              gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
            }
          },
          data: {
            status: SyncStatus.FAILED,
            errors: [errorMsg],
            completedAt: new Date()
          }
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Clean up old sync logs (keep last 30 days)
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 30);
    
    const deletedLogs = await prisma.snapTradeSync.deleteMany({
      where: {
        startedAt: { lt: cleanupDate }
      }
    });

    console.log(`[SNAPTRADE_CRON] Cleaned up ${deletedLogs.count} old sync logs`);

    console.log(`[SNAPTRADE_CRON] Daily sync completed in ${duration}ms`, {
      ...results,
      duration,
      cleanedUpLogs: deletedLogs.count
    });

    // Return success response
    return NextResponse.json({
      success: true,
      duration,
      ...results,
      cleanedUpLogs: deletedLogs.count
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SNAPTRADE_CRON] Fatal error during daily sync:', error);

    return NextResponse.json({
      success: false,
      error: errorMsg,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// Disable caching for cron endpoints
export const dynamic = 'force-dynamic';
export const revalidate = 0;