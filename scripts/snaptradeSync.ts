#!/usr/bin/env node

/**
 * SnapTrade Daily Sync Script
 * 
 * This script should be run as a scheduled job (cron) to sync SnapTrade activities daily.
 * It processes all users with SnapTrade connections and auto-sync enabled.
 * 
 * Usage:
 *   npx tsx scripts/snaptradeSync.ts
 * 
 * Recommended cron schedule:
 *   0 1 * * * # Daily at 1 AM
 */

import { prisma } from '../src/lib/prisma';
import { SnapTradeActivityProcessor } from '../src/lib/snaptrade/activityProcessor';
import { SnapTradeSyncRateLimiter } from '../src/lib/snaptrade/rateLimiter';
import { SyncType, SyncStatus } from '@prisma/client';

interface SyncResult {
  userId: string;
  success: boolean;
  activitiesFound: number;
  ordersCreated: number;
  errors: string[];
  duration: number;
}

async function main() {
  const startTime = Date.now();
  console.log(`[SNAPTRADE_SYNC] Starting daily SnapTrade sync at ${new Date().toISOString()}`);

  const results: SyncResult[] = [];
  let totalActivities = 0;
  let totalOrdersCreated = 0;
  let successfulSyncs = 0;
  let failedSyncs = 0;

  try {
    // Clean up old rate limit entries first
    const cleanedUpEntries = await SnapTradeSyncRateLimiter.cleanupOldEntries();
    console.log(`[SNAPTRADE_SYNC] Cleaned up ${cleanedUpEntries} old rate limit entries`);

    // Get all users with SnapTrade connections
    const users = await prisma.user.findMany({
      where: {
        snapTradeUserId: { not: null },
        snapTradeUserSecret: { not: null }
      }
    });

    console.log(`[SNAPTRADE_SYNC] Found ${users.length} users with SnapTrade connections`);

    if (users.length === 0) {
      console.log(`[SNAPTRADE_SYNC] No users to sync, exiting`);
      return;
    }

    const processor = new SnapTradeActivityProcessor();

    // Process each user
    for (const user of users) {
      const userStartTime = Date.now();
      console.log(`[SNAPTRADE_SYNC] Processing user ${user.id} (${user.email})`);

      try {
        // Create sync log entry
        const syncLog = await prisma.snapTradeSync.create({
          data: {
            userId: user.id,
            connectionId: user.id, // Using user ID as connection ID
            syncType: SyncType.AUTOMATIC,
            status: SyncStatus.RUNNING,
          }
        });

        // Calculate date range (last 2 days to ensure we catch weekend trades)
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 2);
        dateFrom.setHours(0, 0, 0, 0);
        
        const dateTo = new Date();
        dateTo.setHours(23, 59, 59, 999);

        console.log(`[SNAPTRADE_SYNC] User ${user.id}: Syncing from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

        // Process activities
        const result = await processor.processActivities(
          user.id, // Using user ID as connection ID
          user.id,
          {
            dateFrom,
            dateTo,
            onProgress: (progress, message) => {
              if (progress % 20 === 0 || progress === 100) { // Log every 20% or completion
                console.log(`[SNAPTRADE_SYNC] User ${user.id}: ${progress}% - ${message}`);
              }
            }
          }
        );

        const userDuration = Date.now() - userStartTime;

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

        // Record results
        results.push({
          userId: user.id,
          success: result.success,
          activitiesFound: result.activitiesFound,
          ordersCreated: result.ordersCreated,
          errors: result.errors,
          duration: userDuration
        });

        if (result.success) {
          successfulSyncs++;
          totalActivities += result.activitiesFound;
          totalOrdersCreated += result.ordersCreated;
          console.log(
            `[SNAPTRADE_SYNC] User ${user.id} completed successfully: ` +
            `${result.activitiesFound} activities, ${result.ordersCreated} orders created, ` +
            `${result.duplicatesSkipped} duplicates skipped (${userDuration}ms)`
          );
        } else {
          failedSyncs++;
          console.error(`[SNAPTRADE_SYNC] User ${user.id} failed:`, result.errors);
        }

        // Small delay between users to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const userDuration = Date.now() - userStartTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        failedSyncs++;
        results.push({
          userId: user.id,
          success: false,
          activitiesFound: 0,
          ordersCreated: 0,
          errors: [errorMsg],
          duration: userDuration
        });

        console.error(`[SNAPTRADE_SYNC] Failed to process user ${user.id}:`, error);

        // Update any running sync logs for this user
        await prisma.snapTradeSync.updateMany({
          where: {
            userId: user.id,
            status: SyncStatus.RUNNING,
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

    // Clean up old sync logs (keep last 30 days)
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 30);
    
    const deletedLogs = await prisma.snapTradeSync.deleteMany({
      where: {
        startedAt: { lt: cleanupDate }
      }
    });

    const totalDuration = Date.now() - startTime;

    // Print final summary
    console.log(`[SNAPTRADE_SYNC] Daily sync completed in ${totalDuration}ms`);
    console.log(`[SNAPTRADE_SYNC] Results:`);
    console.log(`  - Total users processed: ${users.length}`);
    console.log(`  - Successful syncs: ${successfulSyncs}`);
    console.log(`  - Failed syncs: ${failedSyncs}`);
    console.log(`  - Total activities found: ${totalActivities}`);
    console.log(`  - Total orders created: ${totalOrdersCreated}`);
    console.log(`  - Old logs cleaned up: ${deletedLogs.count}`);

    // Log any errors
    const failedUsers = results.filter(r => !r.success);
    if (failedUsers.length > 0) {
      console.log(`[SNAPTRADE_SYNC] Failed users:`);
      failedUsers.forEach(user => {
        console.log(`  - ${user.userId}: ${user.errors.join(', ')}`);
      });
    }

    // Exit with error code if there were significant failures
    if (failedSyncs > 0 && failedSyncs >= successfulSyncs) {
      console.error(`[SNAPTRADE_SYNC] Too many failures (${failedSyncs}/${users.length}), exiting with error`);
      process.exit(1);
    }

  } catch (error) {
    console.error('[SNAPTRADE_SYNC] Fatal error during daily sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SNAPTRADE_SYNC] Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SNAPTRADE_SYNC] Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Only run if this is the main module
if (require.main === module) {
  main().catch(async (error) => {
    console.error('[SNAPTRADE_SYNC] Unhandled error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

export { main };