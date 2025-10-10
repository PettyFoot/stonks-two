/**
 * Script to investigate failed OrderStaging records
 * Helps diagnose why specific records failed during migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateFailedRecords() {
  try {
    console.log('=== Investigating Failed Staging Records ===\n');

    // Get the specific format mentioned in the logs
    const formatId = 'cmgjtni38000tk104uo6l3mn3';

    // Find all failed records for this format
    const failedRecords = await prisma.orderStaging.findMany({
      where: {
        brokerCsvFormatId: formatId,
        migrationStatus: 'FAILED'
      },
      include: {
        brokerCsvFormat: {
          include: {
            broker: true
          }
        }
      },
      orderBy: { rowIndex: 'asc' }
    });

    console.log(`Found ${failedRecords.length} failed records for format ${formatId}\n`);

    if (failedRecords.length === 0) {
      console.log('No failed records found. Checking for PENDING records...\n');

      const pendingRecords = await prisma.orderStaging.findMany({
        where: {
          brokerCsvFormatId: formatId,
          migrationStatus: 'PENDING'
        },
        take: 5,
        orderBy: { rowIndex: 'asc' }
      });

      console.log(`Found ${pendingRecords.length} PENDING records\n`);
    }

    // Display details for each failed record
    for (const record of failedRecords) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Record ID: ${record.id}`);
      console.log(`Row Index: ${record.rowIndex}`);
      console.log(`Migration Status: ${record.migrationStatus}`);
      console.log(`Retry Count: ${record.retryCount}`);
      console.log(`Last Retry: ${record.lastRetryAt}`);
      console.log(`\nProcessing Errors:`);

      if (record.processingErrors && Array.isArray(record.processingErrors)) {
        record.processingErrors.forEach((error, idx) => {
          console.log(`  ${idx + 1}. ${error}`);
        });
      } else {
        console.log('  No error details available');
      }

      console.log(`\nRaw CSV Row:`);
      console.log(JSON.stringify(record.rawCsvRow, null, 2));
      console.log('');
    }

    // Get statistics
    console.log('\n=== Statistics ===');
    const stats = await prisma.orderStaging.groupBy({
      by: ['migrationStatus'],
      where: {
        brokerCsvFormatId: formatId
      },
      _count: true
    });

    stats.forEach(stat => {
      console.log(`${stat.migrationStatus}: ${stat._count}`);
    });

    // Check for recently migrated orders that might be duplicates
    console.log('\n=== Recently Migrated Orders (Potential Duplicates) ===');
    const recentOrders = await prisma.order.findMany({
      where: {
        importBatch: {
          orderStaging: {
            some: {
              brokerCsvFormatId: formatId
            }
          }
        }
      },
      select: {
        id: true,
        orderId: true,
        symbol: true,
        orderExecutedTime: true,
        side: true,
        orderQuantity: true
      },
      orderBy: { orderExecutedTime: 'desc' },
      take: 10
    });

    console.log(`Found ${recentOrders.length} recently migrated orders:`);
    recentOrders.forEach(order => {
      console.log(`  - ${order.symbol} ${order.side} ${order.orderQuantity} @ ${order.orderExecutedTime}`);
    });

    // Get format info
    console.log('\n=== Format Information ===');
    const format = await prisma.brokerCsvFormat.findUnique({
      where: { id: formatId },
      include: {
        broker: true
      }
    });

    if (format) {
      console.log(`Format Name: ${format.formatName}`);
      console.log(`Broker: ${format.broker.name}`);
      console.log(`Is Approved: ${format.isApproved}`);
      console.log(`Approved By: ${format.approvedBy || 'N/A'}`);
      console.log(`\nField Mappings:`);
      console.log(JSON.stringify(format.fieldMappings, null, 2));
    }

  } catch (error) {
    console.error('Error investigating failed records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateFailedRecords();
