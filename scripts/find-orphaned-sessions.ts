/**
 * Find completed sessions that might not have run trade calculation
 * Run with: npx tsx scripts/find-orphaned-sessions.ts
 */

import { prisma } from '../src/lib/prisma';

async function findOrphanedSessions() {
  try {
    console.log(`\n=== Finding Orphaned Sessions ===\n`);

    // Find batches that are marked complete but might not have calculated trades
    const completedSessions = await prisma.importBatch.findMany({
      where: {
        isSessionComplete: true,
        sessionStatus: 'COMPLETED',
        uploadSessionId: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    if (completedSessions.length === 0) {
      console.log(`✓ No completed sessions with uploadSessionId found`);
      console.log();
      process.exit(0);
    }

    console.log(`Found ${completedSessions.length} completed sessions:\n`);

    for (const batch of completedSessions) {
      console.log(`📊 Session: ${batch.uploadSessionId}`);
      console.log(`   - Batch ID: ${batch.id}`);
      console.log(`   - User ID: ${batch.userId}`);
      console.log(`   - Filename: ${batch.filename}`);
      console.log(`   - Status: ${batch.status}`);
      console.log(`   - Complete: ${batch.isSessionComplete}`);
      console.log(`   - Orders: ${batch.completedRowCount}/${batch.expectedRowCount}`);
      console.log(`   - Hold Trade Calc: ${batch.holdTradeCalculation}`);
      console.log(`   - Created: ${batch.createdAt}`);
      console.log();
    }

    console.log(`\nTo fix a session, run:`);
    console.log(`npx tsx scripts/fix-orphaned-session.ts <uploadSessionId>`);
    console.log();

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error finding orphaned sessions:`, error);
    process.exit(1);
  }
}

findOrphanedSessions();
