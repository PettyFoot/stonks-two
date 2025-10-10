/**
 * Script to manually trigger trade calculation for a specific user
 */

import { PrismaClient } from '@prisma/client';
import { processUserOrders } from '@/lib/tradeBuilder';

const prisma = new PrismaClient();

async function calculateTradesForUser() {
  try {
    // Get the user ID from the options orders
    const optionsOrder = await prisma.order.findFirst({
      where: {
        symbol: 'YHOO150416C00030000'
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!optionsOrder) {
      console.error('❌ No options orders found!');
      return;
    }

    const userId = optionsOrder.userId;
    const userEmail = optionsOrder.user.email;

    console.log('=== Starting Trade Calculation ===');
    console.log(`User ID: ${userId}`);
    console.log(`User Email: ${userEmail}\n`);

    // Count unprocessed orders before
    const unprocessedBefore = await prisma.order.count({
      where: {
        userId,
        orderExecutedTime: { not: null },
        orderCancelledTime: null,
        tradeId: null,
        usedInTrade: false
      }
    });

    console.log(`Unprocessed orders before: ${unprocessedBefore}\n`);

    // Process trades
    console.log('Processing trades...\n');
    const startTime = Date.now();
    const trades = await processUserOrders(userId);
    const duration = Date.now() - startTime;

    console.log(`✅ Trade calculation completed in ${duration}ms`);
    console.log(`Created/updated ${trades.length} trades\n`);

    // Display created trades
    if (trades.length > 0) {
      console.log('=== Trades Created ===');
      trades.forEach((trade, idx) => {
        console.log(`\nTrade ${idx + 1}:`);
        console.log(`  Symbol: ${trade.symbol}`);
        console.log(`  Side: ${trade.side}`);
        console.log(`  Status: ${trade.status}`);
        console.log(`  Entry Price: $${trade.avgEntryPrice?.toFixed(2) || 'N/A'}`);
        console.log(`  Exit Price: $${trade.avgExitPrice?.toFixed(2) || 'N/A'}`);
        console.log(`  Open Quantity: ${trade.openQuantity || 'N/A'}`);
        console.log(`  Close Quantity: ${trade.closeQuantity || 'N/A'}`);
        console.log(`  P&L: $${trade.pnl.toFixed(2)}`);
        console.log(`  Orders: ${trade.ordersInTrade.length}`);
        console.log(`  Open Time: ${trade.openTime}`);
        console.log(`  Close Time: ${trade.closeTime || 'Still Open'}`);
      });
    }

    // Count unprocessed orders after
    const unprocessedAfter = await prisma.order.count({
      where: {
        userId,
        orderExecutedTime: { not: null },
        orderCancelledTime: null,
        tradeId: null,
        usedInTrade: false
      }
    });

    console.log(`\n=== Summary ===`);
    console.log(`Unprocessed orders before: ${unprocessedBefore}`);
    console.log(`Unprocessed orders after: ${unprocessedAfter}`);
    console.log(`Orders processed: ${unprocessedBefore - unprocessedAfter}`);
    console.log(`Trades created: ${trades.length}`);

    // Check options trades specifically
    console.log('\n=== Options Trades Check ===');
    const optionsTrades = await prisma.trade.findMany({
      where: {
        userId,
        symbol: 'YHOO150416C00030000'
      },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      }
    });

    console.log(`Options trades found: ${optionsTrades.length}`);
    if (optionsTrades.length > 0) {
      optionsTrades.forEach((trade, idx) => {
        console.log(`\nOptions Trade ${idx + 1}:`);
        console.log(`  ID: ${trade.id}`);
        console.log(`  Status: ${trade.status}`);
        console.log(`  Side: ${trade.side}`);
        console.log(`  P&L: $${trade.pnl}`);
        console.log(`  Entry: ${trade.entryDate}`);
        console.log(`  Exit: ${trade.exitDate || 'Open'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error calculating trades:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

calculateTradesForUser();
