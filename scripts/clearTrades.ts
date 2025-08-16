import { prisma } from '../src/lib/prisma';

async function clearTrades() {
  try {
    console.log('Clearing all calculated trades...');
    
    // Delete all calculated trades
    const deletedTrades = await prisma.trade.deleteMany({
      where: {
        isCalculated: true
      }
    });
    
    console.log(`Deleted ${deletedTrades.count} calculated trades`);
    
    // Reset tradeId in orders table
    const updatedOrders = await prisma.order.updateMany({
      where: {
        tradeId: {
          not: null
        }
      },
      data: {
        tradeId: null
      }
    });
    
    console.log(`Reset tradeId for ${updatedOrders.count} orders`);
    
    console.log('✅ Database cleared successfully! Ready for fresh trade calculation.');
    
  } catch (error) {
    console.error('Error clearing trades:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTrades();