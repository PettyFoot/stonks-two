import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GrandfatherResult {
  totalFormats: number;
  alreadyApproved: number;
  newlyApproved: number;
  errors: string[];
}

/**
 * Migration script to mark all existing BrokerCsvFormats as approved
 * This implements the "grandfather clause" for the staging system rollout
 */
async function grandfatherExistingFormats(): Promise<GrandfatherResult> {
  console.log('[GrandfatherMigration] Starting migration to approve existing CSV formats...');

  const result: GrandfatherResult = {
    totalFormats: 0,
    alreadyApproved: 0,
    newlyApproved: 0,
    errors: []
  };

  try {
    // Get all existing formats
    const allFormats = await prisma.brokerCsvFormat.findMany({
      select: {
        id: true,
        formatName: true,
        isApproved: true,
        broker: {
          select: { name: true }
        }
      }
    });

    result.totalFormats = allFormats.length;
    console.log(`[GrandfatherMigration] Found ${result.totalFormats} existing CSV formats`);

    if (result.totalFormats === 0) {
      console.log('[GrandfatherMigration] No formats found. Migration complete.');
      return result;
    }

    // Count already approved formats
    result.alreadyApproved = allFormats.filter(f => f.isApproved).length;
    const unapprovedFormats = allFormats.filter(f => !f.isApproved);

    console.log(`[GrandfatherMigration] ${result.alreadyApproved} formats already approved`);
    console.log(`[GrandfatherMigration] ${unapprovedFormats.length} formats need approval`);

    if (unapprovedFormats.length === 0) {
      console.log('[GrandfatherMigration] All formats already approved. Migration complete.');
      return result;
    }

    // Approve all unapproved formats in a transaction
    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.brokerCsvFormat.updateMany({
        where: {
          isApproved: false
        },
        data: {
          isApproved: true,
          approvedBy: null, // System migration - no specific admin user
          approvedAt: new Date()
        }
      });

      result.newlyApproved = updateResult.count;
      console.log(`[GrandfatherMigration] Successfully approved ${result.newlyApproved} formats`);

      // Log the grandfathered formats for audit trail
      for (const format of unapprovedFormats) {
        console.log(`[GrandfatherMigration] Grandfathered: ${format.broker?.name || 'Unknown'} - ${format.formatName} (${format.id})`);
      }
    });

    // Verify the migration
    const verificationCount = await prisma.brokerCsvFormat.count({
      where: { isApproved: true }
    });

    if (verificationCount !== result.totalFormats) {
      throw new Error(`Verification failed: Expected ${result.totalFormats} approved formats, got ${verificationCount}`);
    }

    console.log(`[GrandfatherMigration] Migration completed successfully!`);
    console.log(`[GrandfatherMigration] Total: ${result.totalFormats}, Already approved: ${result.alreadyApproved}, Newly approved: ${result.newlyApproved}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    console.error('[GrandfatherMigration] Migration failed:', error);
    throw error;
  }

  return result;
}

/**
 * Rollback function to undo the grandfather migration if needed
 * WARNING: This will mark all SYSTEM_GRANDFATHER approved formats as unapproved
 */
async function rollbackGrandfatherMigration(): Promise<number> {
  console.log('[GrandfatherMigration] Starting rollback...');

  const rollbackResult = await prisma.brokerCsvFormat.updateMany({
    where: {
      isApproved: true,
      approvedBy: null  // Only rollback system-approved formats
    },
    data: {
      isApproved: false,
      approvedBy: null,
      approvedAt: null
    }
  });

  console.log(`[GrandfatherMigration] Rollback complete. ${rollbackResult.count} formats reverted.`);
  return rollbackResult.count;
}

/**
 * Get migration status
 */
async function getMigrationStatus() {
  const [total, approved, grandfathered] = await Promise.all([
    prisma.brokerCsvFormat.count(),
    prisma.brokerCsvFormat.count({ where: { isApproved: true } }),
    prisma.brokerCsvFormat.count({ where: { isApproved: true, approvedBy: null } })
  ]);

  return {
    totalFormats: total,
    approvedFormats: approved,
    grandfatheredFormats: grandfathered,
    unapprovedFormats: total - approved,
    migrationComplete: approved === total
  };
}

// CLI interface
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        await grandfatherExistingFormats();
        break;

      case 'rollback':
        await rollbackGrandfatherMigration();
        break;

      case 'status':
        const status = await getMigrationStatus();
        console.log('Migration Status:', status);
        break;

      default:
        console.log('Usage:');
        console.log('  npm run grandfather:migrate   - Run the grandfather migration');
        console.log('  npm run grandfather:rollback  - Rollback the migration');
        console.log('  npm run grandfather:status    - Check migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Operation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions for testing
export {
  grandfatherExistingFormats,
  rollbackGrandfatherMigration,
  getMigrationStatus
};

// Run if called directly
if (require.main === module) {
  main();
}