#!/usr/bin/env node

/**
 * Account Deletion Processing Script
 * 
 * This script should be run as a scheduled job (cron) to process pending account deletions.
 * It handles the three stages of account deletion:
 * 1. Soft delete after grace period expires
 * 2. Data anonymization after soft delete
 * 3. Hard delete after final retention period
 * 
 * Usage:
 *   npx tsx scripts/processAccountDeletions.ts
 * 
 * Recommended cron schedule:
 *   0 2 * * * # Daily at 2 AM
 */

import { accountDeletionService } from '../src/lib/services/accountDeletion';

interface JobResult {
  stage: string;
  processed: number;
  errors: number;
  duration: number;
}

async function main() {
  const startTime = Date.now();
  console.log(`[DELETION_JOB] Starting account deletion processing at ${new Date().toISOString()}`);

  const results: JobResult[] = [];
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    // Run the scheduled deletion processing
    await accountDeletionService.scheduleBackgroundJobs();

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log(`[DELETION_JOB] Completed account deletion processing in ${totalDuration}ms`);
    console.log(`[DELETION_JOB] Total processed: ${totalProcessed}, Total errors: ${totalErrors}`);

    // Exit with error code if there were any failures
    if (totalErrors > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('[DELETION_JOB] Fatal error during account deletion processing:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[DELETION_JOB] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[DELETION_JOB] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Only run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('[DELETION_JOB] Unhandled error:', error);
    process.exit(1);
  });
}

export { main };