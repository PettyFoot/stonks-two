import { PrismaClient } from '@prisma/client';
import { TradeBuilder } from '../src/lib/tradeBuilder';

const prisma = new PrismaClient();

async function testQuantityFix() {
  try {
    console.log('Testing quantity calculation fix for shared orders...\n');
    
    // The trades with quantity issues
    const tradeIds = [
      'cmeqaizsh004nua101l3bdm6z',
      'cmeqaizwo004pua106j6i0yjo'
    ];
    
    // Get existing trades to see current state
    const existingTrades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds }
      }
    });
    
    if (existingTrades.length > 0) {
      console.log('Current state of trades:');
      for (const trade of existingTrades) {
        console.log(`  Trade ${trade.id}:`);
        console.log(`    Quantity: ${trade.quantity} (should be 200)`);
        console.log(`    OrdersInTrade: ${trade.ordersInTrade.length} orders`);
      }
      
      // Get the user from one of the trades
      const userId = existingTrades[0].userId;
      
      // Clear trade associations and recalculate
      console.log('\nClearing trade associations and recalculating...');
      
      // Get all orders for this user
      await prisma.order.updateMany({
        where: {
          userId,
          tradeId: { not: null }
        },
        data: {
          tradeId: null,
          usedInTrade: false
        }
      });
      
      // Delete all trades for this user
      await prisma.trade.deleteMany({
        where: {
          userId
        }
      });
      
      // Recalculate with fixed TradeBuilder
      console.log('Recalculating trades with fixed quantity calculation...\n');
      const tradeBuilder = new TradeBuilder();
      const trades = await tradeBuilder.processUserOrders(userId);
      await tradeBuilder.persistTrades(userId);
      
      console.log(`Created ${trades.length} trades\n`);
      
      // Check the results
      const newTrades = await prisma.trade.findMany({
        where: {
          userId
        },
        orderBy: {
          openTime: 'asc'
        }
      });
      
      console.log('New trade quantities:');
      let allCorrect = true;
      for (const trade of newTrades) {
        const isCorrect = trade.quantity === 200 || trade.quantity === 100;
        const symbol = isCorrect ? '✅' : '❌';
        console.log(`  ${symbol} Trade ${trade.id.substring(0, 8)}... : Quantity = ${trade.quantity}`);
        if (!isCorrect && trade.ordersInTrade.length > 1) {
          allCorrect = false;
        }
      }
      
      if (allCorrect) {
        console.log('\n🎉 Success! All trades now have correct quantities.');
      } else {
        console.log('\n⚠️ Some trades still have incorrect quantities.');
      }
      
    } else {
      console.log('Could not find the specified trades. They may have different IDs in this environment.');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testQuantityFix()
  .then(() => {
    console.log('\nTest completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });