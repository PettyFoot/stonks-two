import { PrismaClient } from '@prisma/client';
import { TradeBuilder } from '../src/lib/tradeBuilder';

const prisma = new PrismaClient();

async function testPartialOrderFix() {
  try {
    console.log('Testing partial order fix for split trades...\n');
    
    // The problematic trade IDs
    const problematicTradeIds = [
      'cmeq3w9k7001fua103msut56i', // First trade (LONG)
      'cmeq3w9p6001hua10oz82pysi', // Second trade (SHORT)
    ];
    
    // The three orders involved
    const orderIds = [
      'cmeq3w7qn000tua106aqhfin6', // BUY 100 shares
      'cmeq3w7rn000vua10bk1qn3d3', // SELL 200 shares (split: 100 to close long, 100 to open short)
      'cmeq3w7sp000xua100ww581ss', // BUY 100 shares (close short)
    ];
    
    // Get the orders to verify they exist
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds }
      },
      orderBy: {
        orderExecutedTime: 'asc'
      }
    });
    
    if (orders.length !== 3) {
      console.error(`Expected 3 orders, found ${orders.length}`);
      return;
    }
    
    const userId = orders[0].userId;
    console.log(`Found user: ${userId}`);
    console.log(`Processing orders for testing:\n`);
    
    for (const order of orders) {
      console.log(`  Order ${order.id}:`);
      console.log(`    Symbol: ${order.symbol}`);
      console.log(`    Side: ${order.side}`);
      console.log(`    Quantity: ${order.orderQuantity}`);
      console.log(`    Price: ${order.limitPrice}`);
      console.log(`    ExecutedTime: ${order.orderExecutedTime}`);
    }
    
    // Clear existing trade associations for these orders
    console.log('\n1. Clearing existing trade associations...');
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds }
      },
      data: {
        tradeId: null,
        usedInTrade: false
      }
    });
    
    // Delete the problematic trades
    console.log('2. Deleting problematic trades...');
    await prisma.trade.deleteMany({
      where: {
        id: { in: problematicTradeIds }
      }
    });
    
    // Process orders with the new TradeBuilder
    console.log('3. Processing orders with updated TradeBuilder...\n');
    const tradeBuilder = new TradeBuilder();
    
    // Process each order in sequence to simulate the flow
    console.log('Simulating order flow:');
    console.log('  Step 1: BUY 100 shares - creates LONG position');
    console.log('  Step 2: SELL 200 shares - closes LONG 100, opens SHORT 100');
    console.log('  Step 3: BUY 100 shares - closes SHORT 100\n');
    
    const trades = await tradeBuilder.processUserOrders(userId);
    await tradeBuilder.persistTrades(userId);
    
    console.log(`Created ${trades.length} trades\n`);
    
    // Find the newly created trades
    const newTrades = await prisma.trade.findMany({
      where: {
        userId,
        symbol: orders[0].symbol,
        ordersInTrade: {
          hasSome: orderIds
        }
      },
      orderBy: {
        openTime: 'asc'
      }
    });
    
    console.log('=== RESULTS ===\n');
    
    for (const trade of newTrades) {
      console.log(`Trade ${trade.id}:`);
      console.log(`  Symbol: ${trade.symbol}`);
      console.log(`  Side: ${trade.side}`);
      console.log(`  Status: ${trade.status}`);
      console.log(`  Quantity: ${trade.quantity} (should be 200, not 300)`);
      console.log(`  OpenQuantity: ${trade.openQuantity}`);
      console.log(`  CloseQuantity: ${trade.closeQuantity}`);
      console.log(`  Executions: ${trade.executions}`);
      console.log(`  RemainingQuantity: ${trade.remainingQuantity}`);
      console.log(`  HoldingPeriod: ${trade.holdingPeriod}`);
      console.log(`  AvgEntryPrice: ${trade.avgEntryPrice}`);
      console.log(`  AvgExitPrice: ${trade.avgExitPrice}`);
      console.log(`  P&L: ${trade.pnl}`);
      console.log(`  OrdersInTrade: ${trade.ordersInTrade.join(', ')}`);
      console.log(`  OrdersCount: ${trade.ordersCount}\n`);
    }
    
    // Verify the fix
    console.log('=== VERIFICATION ===\n');
    
    let allPassed = true;
    
    for (const trade of newTrades) {
      if (trade.quantity !== 200) {
        console.error(`❌ Trade ${trade.id} has incorrect quantity: ${trade.quantity} (expected 200)`);
        allPassed = false;
      } else {
        console.log(`✅ Trade ${trade.id} has correct quantity: 200`);
      }
      
      if (trade.status !== 'CLOSED') {
        console.error(`❌ Trade ${trade.id} should be CLOSED but is ${trade.status}`);
        allPassed = false;
      } else {
        console.log(`✅ Trade ${trade.id} is correctly marked as CLOSED`);
      }
      
      if (trade.remainingQuantity !== 0) {
        console.error(`❌ Trade ${trade.id} has remainingQuantity ${trade.remainingQuantity} (expected 0)`);
        allPassed = false;
      } else {
        console.log(`✅ Trade ${trade.id} has correct remainingQuantity: 0`);
      }
    }
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! The partial order fix is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. The fix may need adjustment.');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPartialOrderFix()
  .then(() => {
    console.log('\nTest completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });