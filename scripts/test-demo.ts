#!/usr/bin/env node

/**
 * Quick test script to verify demo functionality
 */

import { getDemoUserId } from '../src/lib/demo/demoSession';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDemoSetup() {
  console.log('🧪 Testing Demo Account Setup...\n');
  
  try {
    const demoUserId = getDemoUserId();
    console.log(`✅ Demo User ID: ${demoUserId}`);
    
    // Test database connection and demo user
    const demoUser = await prisma.user.findUnique({
      where: { id: demoUserId }
    });
    
    if (!demoUser) {
      console.log('❌ Demo user not found in database');
      console.log('💡 Run: npx dotenv -e .env.local -- npx tsx scripts/seedDemoData.ts');
      return;
    }
    
    console.log(`✅ Demo user found: ${demoUser.email}`);
    
    // Check demo trades
    const tradeCount = await prisma.trade.count({ 
      where: { userId: demoUserId } 
    });
    console.log(`✅ Demo trades: ${tradeCount}`);
    
    if (tradeCount === 0) {
      console.log('⚠️  No demo trades found');
      console.log('💡 Run: npx dotenv -e .env.local -- npx tsx scripts/seedDemoData.ts');
      return;
    }

    // Get detailed trade breakdown
    const openTrades = await prisma.trade.count({
      where: { userId: demoUserId, status: 'OPEN' }
    });
    const closedTrades = await prisma.trade.count({
      where: { userId: demoUserId, status: 'CLOSED' }
    });
    
    console.log(`   - Open trades: ${openTrades}`);
    console.log(`   - Closed trades: ${closedTrades}`);
    
    // Show sample trades
    const sampleTrades = await prisma.trade.findMany({
      where: { userId: demoUserId },
      take: 5,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        symbol: true,
        side: true,
        pnl: true,
        status: true,
        date: true,
        quantity: true
      }
    });
    
    console.log('   Sample trades:');
    sampleTrades.forEach((trade, i) => {
      console.log(`     ${i + 1}. ${trade.symbol} ${trade.side} ${trade.quantity} shares - P&L: $${trade.pnl} (${trade.status}) - Date: ${trade.date.toISOString().split('T')[0]}`);
    });
    
    // Check demo records
    const recordsCount = await prisma.recordsEntry.count({ 
      where: { userId: demoUserId } 
    });
    console.log(`✅ Demo records: ${recordsCount}`);
    
    console.log('\n🎉 Demo setup looks good!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Go to http://localhost:3002');
    console.log('3. Click "Try Demo" to test the demo flow');
    
  } catch (error) {
    console.error('❌ Error testing demo setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testDemoSetup().catch(console.error);
}

export { testDemoSetup };