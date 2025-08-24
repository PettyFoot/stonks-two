import { PrismaClient } from '@prisma/client';
import { TradeBuilder } from '../src/lib/tradeBuilder';

const prisma = new PrismaClient();

async function resetAndRecalculateTrades() {
  try {
    console.log('Starting trade reset and recalculation...\n');
    
    // Step 1: Update all orders to set usedInTrade to FALSE
    console.log('Step 1: Setting usedInTrade to FALSE for all orders...');
    const updateUsedInTradeResult = await prisma.order.updateMany({
      where: {
        usedInTrade: true
      },
      data: {
        usedInTrade: false
      }
    });
    console.log(`  Updated ${updateUsedInTradeResult.count} orders to set usedInTrade = FALSE`);
    
    // Step 2: Clear tradeId from all orders
    console.log('\nStep 2: Clearing tradeId from all orders...');
    const clearTradeIdResult = await prisma.order.updateMany({
      where: {
        tradeId: { not: null }
      },
      data: {
        tradeId: null
      }
    });
    console.log(`  Cleared tradeId from ${clearTradeIdResult.count} orders`);
    
    // Step 3: Delete all trades
    console.log('\nStep 3: Deleting all trades from the trades table...');
    const deleteTradesResult = await prisma.trade.deleteMany({});
    console.log(`  Deleted ${deleteTradesResult.count} trades`);
    
    // Step 4: Get all unique user IDs from orders
    console.log('\nStep 4: Getting all users with orders...');
    const usersWithOrders = await prisma.order.findMany({
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    console.log(`  Found ${usersWithOrders.length} users with orders`);
    
    // Step 5: Recalculate trades for each user
    console.log('\nStep 5: Recalculating trades for each user...');
    let totalTradesCreated = 0;
    
    for (const { userId } of usersWithOrders) {
      console.log(`\n  Processing user: ${userId}`);
      
      // Get order count for this user
      const orderCount = await prisma.order.count({
        where: {
          userId,
          orderExecutedTime: { not: null },
          orderCancelledTime: null
        }
      });
      console.log(`    Found ${orderCount} executed orders`);
      
      // Recalculate trades using TradeBuilder
      const tradeBuilder = new TradeBuilder();
      const trades = await tradeBuilder.processUserOrders(userId);
      await tradeBuilder.persistTrades(userId);
      
      console.log(`    Created ${trades.length} trades`);
      totalTradesCreated += trades.length;
    }
    
    console.log('\n========================================');
    console.log('Trade recalculation completed successfully!');
    console.log(`Total trades created: ${totalTradesCreated}`);
    console.log('========================================\n');
    
    // Verify specific trades mentioned in the original issue
    console.log('Verifying specific trades mentioned in the issue:\n');
    
    // Check for orders that should be grouped together
    const orderGroups = [
      {
        name: 'Trade 1 (was cmeot15hh0015uay0ntsp1rtb)',
        orderIds: ['cmeot14p90005uay0zpqerbpk', 'cmeot14re0007uay03jd9opnw']
      },
      {
        name: 'Trade 2 (was cmeot15rc0019uay0onv5izz9)',
        orderIds: ['cmeot14ud000duay0oyx563ed', 'cmeot14vc000fuay0fflyem2v', 'cmeot14wc000huay07e47s8ot', 'cmeot14xd000juay04zqp5aym']
      }
    ];
    
    for (const group of orderGroups) {
      console.log(`\nChecking ${group.name}:`);
      
      // Find trades containing these orders
      const trades = await prisma.trade.findMany({
        where: {
          ordersInTrade: {
            hasEvery: group.orderIds
          }
        }
      });
      
      if (trades.length === 0) {
        console.log('  ❌ No trade found with these orders');
        
        // Check if orders exist and their current state
        const orders = await prisma.order.findMany({
          where: {
            id: { in: group.orderIds }
          },
          select: {
            id: true,
            orderId: true,
            symbol: true,
            tradeId: true,
            usedInTrade: true
          }
        });
        
        console.log(`  Found ${orders.length} orders out of ${group.orderIds.length} expected`);
        for (const order of orders) {
          console.log(`    Order ${order.id}: tradeId=${order.tradeId}, usedInTrade=${order.usedInTrade}`);
        }
      } else {
        for (const trade of trades) {
          console.log(`  ✅ Trade found: ${trade.id}`);
          console.log(`     Symbol: ${trade.symbol}`);
          console.log(`     Status: ${trade.status}`);
          console.log(`     Executions: ${trade.executions}`);
          console.log(`     RemainingQuantity: ${trade.remainingQuantity}`);
          console.log(`     HoldingPeriod: ${trade.holdingPeriod}`);
          console.log(`     AvgExitPrice: ${trade.avgExitPrice}`);
          console.log(`     OrdersInTrade: ${trade.ordersInTrade.length} orders`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error during trade reset and recalculation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetAndRecalculateTrades()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });