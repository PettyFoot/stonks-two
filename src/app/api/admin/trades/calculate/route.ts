import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';
import { processUserOrders } from '@/lib/tradeBuilder';
import { z } from 'zod';

const CalculateRequestSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
});

// POST - Trigger manual trade calculation for selected users
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
    const { userIds } = CalculateRequestSchema.parse(body);

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        deletedAt: null
      },
      select: {
        id: true,
        email: true
      }
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map(u => u.id);
      const missingIds = userIds.filter(id => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: 'Some users not found or deleted',
          missingUserIds: missingIds
        },
        { status: 400 }
      );
    }

    const results = [];

    // Process each user
    for (const user of users) {
      try {
        console.log(`[ADMIN_TRADE_CALC] Starting trade calculation for user ${user.email} (${user.id})`);

        // Get order count before processing
        const ordersBefore = await prisma.order.count({
          where: {
            userId: user.id,
            usedInTrade: false
          }
        });

        // Process user orders into trades
        const trades = await processUserOrders(user.id);

        // Get statistics after processing
        const completedTrades = trades.filter(t => t.status === 'CLOSED');
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const totalPnL = completedTrades.reduce((sum, t) => sum + t.pnl, 0);

        // Get order count after processing
        const ordersAfter = await prisma.order.count({
          where: {
            userId: user.id,
            usedInTrade: false
          }
        });

        const ordersProcessed = ordersBefore - ordersAfter;

        console.log(`[ADMIN_TRADE_CALC] Trade calculation result for user ${user.email}:`, {
          tradesCreated: trades.length,
          completedTrades: completedTrades.length,
          openTrades: openTrades.length,
          totalPnL: totalPnL.toFixed(2),
          ordersProcessed
        });

        results.push({
          userId: user.id,
          email: user.email,
          success: true,
          tradesCreated: trades.length,
          completedTrades: completedTrades.length,
          openTrades: openTrades.length,
          totalPnL,
          ordersProcessed,
          errors: []
        });

        if (trades.length > 0) {
          console.log(`[ADMIN_TRADE_CALC] Successfully processed trades for user ${user.email}: ${trades.length} trades created`);
        } else {
          console.log(`[ADMIN_TRADE_CALC] No new trades created for user ${user.email}`);
        }

      } catch (error) {
        console.error(`[ADMIN_TRADE_CALC] Exception during trade calculation for user ${user.email}:`, error);

        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          tradesCreated: 0,
          completedTrades: 0,
          openTrades: 0,
          totalPnL: 0,
          ordersProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalTradesCreated = results.reduce((sum, r) => sum + r.tradesCreated, 0);
    const totalCompletedTrades = results.reduce((sum, r) => sum + r.completedTrades, 0);
    const totalOpenTrades = results.reduce((sum, r) => sum + r.openTrades, 0);
    const totalPnL = results.reduce((sum, r) => sum + r.totalPnL, 0);
    const totalOrdersProcessed = results.reduce((sum, r) => sum + r.ordersProcessed, 0);

    console.log(`[ADMIN_TRADE_CALC] Final summary:`, {
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      totalTradesCreated,
      totalCompletedTrades,
      totalOpenTrades,
      totalPnL: totalPnL.toFixed(2),
      totalOrdersProcessed,
      results: results.map(r => ({
        email: r.email,
        success: r.success,
        tradesCreated: r.tradesCreated,
        totalPnL: r.totalPnL.toFixed(2),
        errors: r.errors
      }))
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      summary: {
        totalTradesCreated,
        totalCompletedTrades,
        totalOpenTrades,
        totalPnL,
        totalOrdersProcessed
      },
      results
    });

  } catch (error) {
    console.error('Error in manual trade calculation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate trades' },
      { status: 500 }
    );
  }
}