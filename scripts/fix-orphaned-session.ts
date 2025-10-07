/**
 * Fix orphaned completed session that didn't trigger trade calculation
 * Run with: npx tsx scripts/fix-orphaned-session.ts <uploadSessionId>
 */

import { prisma } from '../src/lib/prisma';
import { TradeBuilder } from '../src/lib/tradeBuilder';

async function fixOrphanedSession(uploadSessionId: string) {
  try {
    console.log(`\n=== Fixing Orphaned Session: ${uploadSessionId} ===\n`);

    // Find all batches for this session
    const importBatches = await prisma.importBatch.findMany({
      where: {
        uploadSessionId,
        sessionStatus: { in: ['ACTIVE', 'COMPLETED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (importBatches.length === 0) {
      console.error(`❌ No batches found for session ${uploadSessionId}`);
      process.exit(1);
    }

    const latestBatch = importBatches[0];

    console.log(`📊 Session Info:`);
    console.log(`   - User ID: ${latestBatch.userId}`);
    console.log(`   - Batches: ${importBatches.length}`);
    console.log(`   - Status: ${latestBatch.sessionStatus}`);
    console.log(`   - Complete: ${latestBatch.isSessionComplete}`);
    console.log(`   - Total Orders: ${latestBatch.completedRowCount}/${latestBatch.expectedRowCount}`);
    console.log(`   - Hold Trade Calc: ${latestBatch.holdTradeCalculation}`);
    console.log();

    // Mark all batches as complete if not already
    if (latestBatch.sessionStatus !== 'COMPLETED' || !latestBatch.isSessionComplete) {
      console.log(`🔧 Marking session as complete...`);
      await prisma.importBatch.updateMany({
        where: {
          uploadSessionId,
          sessionStatus: 'ACTIVE'
        },
        data: {
          isSessionComplete: true,
          holdTradeCalculation: false,
          sessionStatus: 'COMPLETED',
          processingCompleted: new Date()
        }
      });
      console.log(`✓ Session marked complete\n`);
    } else {
      console.log(`✓ Session already marked complete\n`);
    }

    // Run trade calculation
    console.log(`🔄 Running trade calculation for user ${latestBatch.userId}...`);
    const tradeBuilder = new TradeBuilder();

    console.log(`   Step 1: Processing user orders...`);
    await tradeBuilder.processUserOrders(latestBatch.userId);

    console.log(`   Step 2: Persisting trades...`);
    await tradeBuilder.persistTrades(latestBatch.userId);

    console.log(`\n✅ Trade calculation completed successfully!`);

    // Verify trades were created
    const tradesCount = await prisma.trade.count({
      where: { userId: latestBatch.userId }
    });

    console.log(`\n📈 Results:`);
    console.log(`   - Total trades for user: ${tradesCount}`);
    console.log();

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error fixing orphaned session:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Get session ID from command line args
const uploadSessionId = process.argv[2];

if (!uploadSessionId) {
  console.error('❌ Usage: npx tsx scripts/fix-orphaned-session.ts <uploadSessionId>');
  console.error('   Example: npx tsx scripts/fix-orphaned-session.ts 30c45db41f1600b7');
  process.exit(1);
}

fixOrphanedSession(uploadSessionId);
