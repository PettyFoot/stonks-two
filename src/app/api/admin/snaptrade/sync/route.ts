import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';
import { syncTradesForConnection } from '@/lib/snaptrade/sync';
import { SyncType } from '@/lib/snaptrade/types';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
});

// POST - Trigger manual sync for selected users
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds } = SyncRequestSchema.parse(body);

    // Verify all users exist and have SnapTrade connections
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        snapTradeUserId: { not: null }
      },
      select: {
        id: true,
        email: true,
        snapTradeUserId: true
      }
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map(u => u.id);
      const missingIds = userIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: 'Some users not found or missing SnapTrade connections',
          missingUserIds: missingIds
        },
        { status: 400 }
      );
    }

    const results = [];

    // Process each user
    for (const user of users) {
      try {
        console.log(`[ADMIN_SYNC] Starting manual sync for user ${user.email} (${user.id})`);

        const result = await syncTradesForConnection({
          userId: user.id,
          connectionId: user.id, // Using user ID as connection ID
          syncType: SyncType.MANUAL
        });

        console.log(`[ADMIN_SYNC] Sync result for user ${user.email}:`, {
          success: result.success,
          tradesImported: result.tradesImported,
          tradesSkipped: result.tradesSkipped,
          errors: result.errors
        });

        results.push({
          userId: user.id,
          email: user.email,
          success: result.success,
          tradesImported: result.tradesImported,
          tradesSkipped: result.tradesSkipped,
          errors: result.errors,
          tradeProcessing: result.tradeProcessing
        });

        if (result.success) {
          console.log(`[ADMIN_SYNC] Successfully completed sync for user ${user.email}: ${result.tradesImported} trades imported`);
        } else {
          console.log(`[ADMIN_SYNC] Sync failed for user ${user.email}. Errors: ${result.errors?.join(', ')}`);
        }

      } catch (error) {
        console.error(`[ADMIN_SYNC] Exception during sync for user ${user.email}:`, error);

        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          tradesImported: 0,
          tradesSkipped: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          tradeProcessing: undefined
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalTradesImported = results.reduce((sum, r) => sum + r.tradesImported, 0);

    // Calculate trade processing summary
    const totalNewTrades = results.reduce((sum, r) => sum + (r.tradeProcessing?.newTradesCreated || 0), 0);
    const totalCompletedTrades = results.reduce((sum, r) => sum + (r.tradeProcessing?.completedTrades || 0), 0);
    const totalOpenTrades = results.reduce((sum, r) => sum + (r.tradeProcessing?.openTrades || 0), 0);
    const totalPnL = results.reduce((sum, r) => sum + (r.tradeProcessing?.totalPnL || 0), 0);
    const tradeProcessingErrors = results.filter(r => r.tradeProcessing && !r.tradeProcessing.success).length;

    console.log(`[ADMIN_SYNC] Final summary:`, {
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      totalTradesImported,
      tradeProcessing: {
        totalNewTrades,
        totalCompletedTrades,
        totalOpenTrades,
        totalPnL: totalPnL.toFixed(2),
        errors: tradeProcessingErrors
      },
      results: results.map(r => ({
        email: r.email,
        success: r.success,
        tradesImported: r.tradesImported,
        tradeProcessing: r.tradeProcessing,
        errors: r.errors
      }))
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      totalTradesImported,
      tradeProcessing: {
        totalNewTrades,
        totalCompletedTrades,
        totalOpenTrades,
        totalPnL,
        errors: tradeProcessingErrors
      },
      results
    });

  } catch (error) {
    console.error('Error in manual SnapTrade sync:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}