/**
 * Script to check if options orders are ready for trade calculation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOptionsOrders() {
  try {
    console.log('=== Checking Options Orders ===\n');

    // Find the 3 options orders we just migrated
    const optionsOrders = await prisma.order.findMany({
      where: {
        symbol: 'YHOO150416C00030000'
      },
      orderBy: { orderExecutedTime: 'asc' }
    });

    console.log(`Found ${optionsOrders.length} orders for symbol YHOO150416C00030000\n`);

    if (optionsOrders.length === 0) {
      console.log('❌ No orders found! Migration may not have worked correctly.');
      return;
    }

    // Display each order
    optionsOrders.forEach((order, idx) => {
      console.log(`Order ${idx + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  Order ID: ${order.orderId}`);
      console.log(`  Symbol: ${order.symbol}`);
      console.log(`  Side: ${order.side}`);
      console.log(`  Quantity: ${order.orderQuantity}`);
      console.log(`  Price: $${order.limitPrice}`);
      console.log(`  Executed: ${order.orderExecutedTime}`);
      console.log(`  Status: ${order.orderStatus}`);
      console.log(`  Used in Trade: ${order.usedInTrade}`);
      console.log(`  Trade ID: ${order.tradeId || 'null'}`);
      console.log(`  User ID: ${order.userId}`);
      console.log('');
    });

    // Check if they meet criteria for trade processing
    const eligibleOrders = optionsOrders.filter(order =>
      order.orderExecutedTime !== null &&
      order.orderCancelledTime === null &&
      order.tradeId === null &&
      order.usedInTrade === false
    );

    console.log('=== Eligibility Check ===');
    console.log(`Eligible for trade processing: ${eligibleOrders.length}/${optionsOrders.length}`);

    if (eligibleOrders.length !== optionsOrders.length) {
      console.log('\n❌ Some orders are NOT eligible:');
      optionsOrders.forEach(order => {
        if (!eligibleOrders.includes(order)) {
          const reasons = [];
          if (!order.orderExecutedTime) reasons.push('no execution time');
          if (order.orderCancelledTime) reasons.push('cancelled');
          if (order.tradeId) reasons.push(`already in trade ${order.tradeId}`);
          if (order.usedInTrade) reasons.push('usedInTrade=true');
          console.log(`  - Order ${order.orderId}: ${reasons.join(', ')}`);
        }
      });
    } else {
      console.log('✅ All orders are eligible for trade processing!');
    }

    // Check if user has any existing trades for this symbol
    if (optionsOrders.length > 0) {
      const userId = optionsOrders[0].userId;

      console.log('\n=== Checking for Existing Trades ===');
      const existingTrades = await prisma.trade.findMany({
        where: {
          userId,
          symbol: 'YHOO150416C00030000'
        }
      });

      console.log(`Found ${existingTrades.length} existing trades for this symbol`);

      if (existingTrades.length > 0) {
        existingTrades.forEach((trade, idx) => {
          console.log(`\nTrade ${idx + 1}:`);
          console.log(`  ID: ${trade.id}`);
          console.log(`  Side: ${trade.side}`);
          console.log(`  Status: ${trade.status}`);
          console.log(`  Entry: ${trade.entryDate}`);
          console.log(`  Exit: ${trade.exitDate || 'N/A'}`);
          console.log(`  Orders: ${trade.ordersInTrade.length}`);
        });
      }

      // Check all unprocessed orders for this user
      console.log('\n=== All Unprocessed Orders for User ===');
      const allUnprocessed = await prisma.order.findMany({
        where: {
          userId,
          orderExecutedTime: { not: null },
          orderCancelledTime: null,
          tradeId: null,
          usedInTrade: false
        },
        select: {
          symbol: true,
          side: true,
          orderQuantity: true,
          orderExecutedTime: true
        },
        orderBy: { orderExecutedTime: 'asc' }
      });

      console.log(`Total unprocessed orders for user: ${allUnprocessed.length}`);

      if (allUnprocessed.length > 0) {
        console.log('\nBreakdown by symbol:');
        const symbolCounts = allUnprocessed.reduce((acc, order) => {
          acc[order.symbol] = (acc[order.symbol] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(symbolCounts).forEach(([symbol, count]) => {
          console.log(`  ${symbol}: ${count} orders`);
        });
      }
    }

  } catch (error) {
    console.error('Error checking options orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOptionsOrders();
