/**
 * Script to retry failed OrderStaging records
 * Resets failed records back to PENDING and retriggers migration
 */

import { PrismaClient } from '@prisma/client';
import { FormatApprovalService } from '@/lib/services/FormatApprovalService';

const prisma = new PrismaClient();

async function retryFailedRecords() {
  try {
    console.log('=== Retrying Failed Staging Records ===\n');

    const formatId = 'cmgjtni38000tk104uo6l3mn3';

    // Find all failed records for this format
    const failedRecords = await prisma.orderStaging.findMany({
      where: {
        brokerCsvFormatId: formatId,
        migrationStatus: 'FAILED'
      },
      select: {
        id: true,
        rowIndex: true,
        rawCsvRow: true
      },
      orderBy: { rowIndex: 'asc' }
    });

    console.log(`Found ${failedRecords.length} failed records\n`);

    if (failedRecords.length === 0) {
      console.log('No failed records to retry.');
      return;
    }

    // Display what we're about to retry
    failedRecords.forEach((record, idx) => {
      const symbol = (record.rawCsvRow as any)?.symbol || 'N/A';
      console.log(`${idx + 1}. Row ${record.rowIndex} - Symbol: ${symbol}`);
    });

    console.log('\nResetting failed records to PENDING...');

    // Reset failed records back to PENDING
    const resetResult = await prisma.orderStaging.updateMany({
      where: {
        id: { in: failedRecords.map(r => r.id) }
      },
      data: {
        migrationStatus: 'PENDING',
        processingErrors: [],
        retryCount: 0,
        lastRetryAt: null
      }
    });

    console.log(`Reset ${resetResult.count} records to PENDING\n`);

    console.log('Triggering migration retry...\n');

    // Trigger the orphaned staging processor
    const formatService = new FormatApprovalService();
    const result = await formatService.processOrphanedStagingRecords('system-retry');

    console.log('\n=== Retry Results ===');
    console.log(`Success: ${result.success}`);
    console.log(`Processed: ${result.processedCount}`);
    console.log(`Errors: ${result.errorCount}`);
    console.log(`Skipped: ${result.skippedCount}`);

    if (result.errors.length > 0) {
      console.log('\nRemaining Errors:');
      result.errors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. ${error}`);
      });
    }

    if (result.processedCount > 0) {
      console.log(`\n✅ Successfully migrated ${result.processedCount} records!`);
    }

    if (result.errorCount > 0) {
      console.log(`\n❌ ${result.errorCount} records still failed. Check logs above for details.`);
    }

  } catch (error) {
    console.error('Error retrying failed records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

retryFailedRecords();
