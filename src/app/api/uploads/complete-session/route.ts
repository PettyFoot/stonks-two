import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradeBuilder } from '@/lib/tradeBuilder';
import { incrementUploadCount } from '@/lib/uploadRateLimiter';

/**
 * POST /api/uploads/complete-session
 * Manually complete an upload session and trigger trade calculation
 * Used for incomplete sessions that need to be finalized
 * Also handles orphaned completed sessions that didn't trigger calculation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uploadSessionId } = await request.json();

    if (!uploadSessionId) {
      return NextResponse.json(
        { error: 'uploadSessionId is required' },
        { status: 400 }
      );
    }

    console.log(`[Complete Session] Starting manual completion for session ${uploadSessionId}`);

    // Find all import batches in this session (both ACTIVE and COMPLETED)
    const importBatches = await prisma.importBatch.findMany({
      where: {
        userId: user.id,
        uploadSessionId,
        sessionStatus: { in: ['ACTIVE', 'COMPLETED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (importBatches.length === 0) {
      console.log(`[Complete Session] No batches found for session ${uploadSessionId}`);
      return NextResponse.json(
        { error: 'No session found with this ID' },
        { status: 404 }
      );
    }

    const latestBatch = importBatches[0];
    const alreadyComplete = latestBatch.sessionStatus === 'COMPLETED' && latestBatch.isSessionComplete;

    if (alreadyComplete) {
      console.log(`[Complete Session] Session ${uploadSessionId} already marked complete. Verifying trade calculation...`);
    } else {
      console.log(`[Complete Session] Marking session ${uploadSessionId} as complete (${importBatches.length} batches)`);

      // Mark all batches in session as complete
      await prisma.importBatch.updateMany({
        where: {
          userId: user.id,
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
    }

    // Always run trade calculation (handles both new completions and orphaned sessions)
    try {
      console.log(`[Complete Session] ✓ Running trade calculation for user ${user.id}, session ${uploadSessionId}`);
      console.log(`[Complete Session] - Total orders in session: ${latestBatch.completedRowCount}`);
      console.log(`[Complete Session] - Latest batch ID: ${latestBatch.id}`);

      const tradeBuilder = new TradeBuilder();
      await tradeBuilder.processUserOrders(user.id);
      await tradeBuilder.persistTrades(user.id);

      console.log(`[Complete Session] ✓ Trade calculation completed successfully`);
    } catch (error) {
      console.error(`[Complete Session] ✗ Trade calculation FAILED for session ${uploadSessionId}:`, error);
      console.error(`[Complete Session] Error details:`, error instanceof Error ? error.message : 'Unknown error');
      console.error(`[Complete Session] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');

      return NextResponse.json(
        {
          error: 'Session marked complete but trade calculation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          sessionId: uploadSessionId,
          batchId: latestBatch.id
        },
        { status: 500 }
      );
    }

    // Increment upload count for completed session (only if not already complete)
    if (!alreadyComplete) {
      try {
        await incrementUploadCount(user.id);
        console.log(`[Complete Session] ✓ Upload count incremented for user ${user.id}`);
      } catch (error) {
        console.error('[Complete Session] Failed to increment upload count:', error);
        // Don't fail for this
      }
    } else {
      console.log(`[Complete Session] ⏭️  Upload count not incremented (session was already complete)`);
    }

    return NextResponse.json({
      success: true,
      message: alreadyComplete
        ? 'Trade calculation re-run successfully for already-completed session'
        : 'Session completed and trades calculated successfully',
      uploadSessionId,
      completedBatches: importBatches.length,
      totalOrders: latestBatch.completedRowCount,
      wasAlreadyComplete: alreadyComplete
    });

  } catch (error) {
    console.error('[Complete Session] ✗ Unexpected error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to complete session'
      },
      { status: 500 }
    );
  }
}
