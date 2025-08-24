import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { TradeBuilder } from '@/lib/tradeBuilder';

async function recalculateTrades() {
  console.log('Starting trade recalculation...');
  
  // Get the problematic trades
  const problematicTradeIds = [
    'cmeot15hh0015uay0ntsp1rtb', // Trade with wrong executions, NULL remainingQuantity
    'cmeot15rc0019uay0onv5izz9', // Trade with wrong holding period, exit price, executions
  ];
  
  // Get the trades to find the user
  const trades = await prisma.trade.findMany({
    where: {
      id: { in: problematicTradeIds }
    }
  });
  
  if (trades.length === 0) {
    console.error('No trades found with the specified IDs');
    return;
  }
  
  const userId = trades[0].userId;
  console.log(`Found user: ${userId}`);
  
  // First, let's check the current state of these trades
  console.log('\n=== Current Trade State ===');
  for (const trade of trades) {
    console.log(`Trade ${trade.id}:`);
    console.log(`  Symbol: ${trade.symbol}`);
    console.log(`  Status: ${trade.status}`);
    console.log(`  Executions: ${trade.executions}`);
    console.log(`  RemainingQuantity: ${trade.remainingQuantity}`);
    console.log(`  HoldingPeriod: ${trade.holdingPeriod}`);
    console.log(`  ExitPrice: ${trade.exitPrice}`);
    console.log(`  OrdersInTrade: ${trade.ordersInTrade}`);
  }
  
  // Clear the tradeId from all orders for this user to recalculate
  console.log('\nClearing tradeId from orders...');
  await prisma.order.updateMany({
    where: {
      userId,
      tradeId: { not: null }
    },
    data: {
      tradeId: null
    }
  });
  
  // Delete existing calculated trades for this user
  console.log('Deleting existing calculated trades...');
  await prisma.trade.deleteMany({
    where: {
      userId,
      isCalculated: true
    }
  });
  
  // Recalculate trades using TradeBuilder
  console.log('\nRecalculating trades...');
  const tradeBuilder = new TradeBuilder();
  const newTrades = await tradeBuilder.processUserOrders(userId);
  await tradeBuilder.persistTrades(userId);
  
  console.log(`\nCreated ${newTrades.length} trades`);
  
  // Check the new state of the problematic trades
  console.log('\n=== New Trade State ===');
  
  // Find trades that match the same orders
  const orderIds1 = ['cmeot14p90005uay0zpqerbpk', 'cmeot14re0007uay03jd9opnw'];
  const orderIds2 = ['cmeot14ud000duay0oyx563ed', 'cmeot14vc000fuay0fflyem2v', 'cmeot14wc000huay07e47s8ot', 'cmeot14xd000juay04zqp5aym'];
  
  const newProblematicTrades = await prisma.trade.findMany({
    where: {
      userId,
      OR: [
        { ordersInTrade: { hasEvery: orderIds1 } },
        { ordersInTrade: { hasEvery: orderIds2 } }
      ]
    }
  });
  
  for (const trade of newProblematicTrades) {
    console.log(`\nTrade ${trade.id} (was ${trade.ordersInTrade.length === 2 ? problematicTradeIds[0] : problematicTradeIds[1]}):`);
    console.log(`  Symbol: ${trade.symbol}`);
    console.log(`  Status: ${trade.status}`);
    console.log(`  Executions: ${trade.executions}`);
    console.log(`  RemainingQuantity: ${trade.remainingQuantity}`);
    console.log(`  HoldingPeriod: ${trade.holdingPeriod}`);
    console.log(`  ExitPrice: ${trade.exitPrice}`);
    console.log(`  AvgExitPrice: ${trade.avgExitPrice}`);
    console.log(`  OrdersInTrade: ${trade.ordersInTrade}`);
    console.log(`  OrdersCount: ${trade.ordersCount}`);
  }
  
  // Verify the orders are using correct IDs
  console.log('\n=== Order ID Verification ===');
  const orders = await prisma.order.findMany({
    where: {
      id: { in: [...orderIds1, ...orderIds2] }
    },
    select: {
      id: true,
      orderId: true,
      symbol: true,
      tradeId: true
    }
  });
  
  for (const order of orders) {
    console.log(`Order - ID: ${order.id}, OrderID: ${order.orderId}, Symbol: ${order.symbol}, TradeID: ${order.tradeId}`);
  }
}

recalculateTrades()
  .catch(console.error)
  .finally(() => prisma.$disconnect());