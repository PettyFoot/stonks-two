#!/usr/bin/env tsx
/**
 * Standalone script to calculate trades from orders using the new trade processing system
 * Run with: npx tsx scripts/calculateTrades.ts [userId]
 */

import { PrismaClient } from '@prisma/client';
import { processUserOrders } from '../src/lib/tradeBuilder';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    // If no userId provided, process all users
    console.log('No userId provided. Processing all users...');
    
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      console.log(`\nProcessing trades for user: ${user.email} (${user.id})`);
      
      try {
        const trades = await processUserOrders(user.id);
        console.log(`✓ Processed ${trades.length} new trades for ${user.email}`);
        
        // Display summary
        const completedTrades = trades.filter(t => t.status === 'CLOSED');
        const openTrades = trades.filter(t => t.status === 'OPEN');
        const totalPnL = completedTrades.reduce((sum, t) => sum + t.pnl, 0);
        const winners = completedTrades.filter(t => t.pnl > 0).length;
        const losers = completedTrades.filter(t => t.pnl < 0).length;
        
        console.log(`  Summary: ${completedTrades.length} completed, ${openTrades.length} open, ${winners}W/${losers}L, Total P&L: $${totalPnL.toFixed(2)}`);
      } catch (error) {
        console.error(`✗ Error processing user ${user.email}:`, error);
      }
    }
  } else {
    // Process specific user
    console.log(`Processing trades for user ID: ${userId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }
    
    try {
      const trades = await processUserOrders(userId);
      console.log(`✓ Processed ${trades.length} new trades for ${user.email}`);
      
      // Display detailed results
      console.log('\nProcessed Trades:');
      console.log('═══════════════════════════════════════════');
      
      for (const trade of trades) {
        const status = trade.status === 'CLOSED' ? '🔒 CLOSED' : '🔓 OPEN';
        console.log(`
Symbol: ${trade.symbol}
Side: ${trade.side}
Status: ${status}
${trade.openQuantity ? `Open Quantity: ${trade.openQuantity}` : ''}
${trade.closeQuantity ? `Close Quantity: ${trade.closeQuantity}` : ''}
${trade.avgEntryPrice ? `Entry Price: $${trade.avgEntryPrice.toFixed(2)}` : ''}
${trade.avgExitPrice ? `Exit Price: $${trade.avgExitPrice.toFixed(2)}` : ''}
P&L: $${trade.pnl.toFixed(2)} ${trade.pnl >= 0 ? '✓' : '✗'}
Orders: ${trade.ordersInTrade.length} orders (${trade.ordersInTrade.join(', ')})
───────────────────────────────────────────`);
      }
      
      // Summary
      const completedTrades = trades.filter(t => t.status === 'CLOSED');
      const openTrades = trades.filter(t => t.status === 'OPEN');
      const totalPnL = completedTrades.reduce((sum, t) => sum + t.pnl, 0);
      const winners = completedTrades.filter(t => t.pnl > 0).length;
      const losers = completedTrades.filter(t => t.pnl < 0).length;
      const winRate = completedTrades.length > 0 ? (winners / completedTrades.length * 100).toFixed(1) : 0;
      
      console.log(`
═══════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════
Total New Trades: ${trades.length}
Completed Trades: ${completedTrades.length}
Open Trades: ${openTrades.length}
Winners: ${winners}
Losers: ${losers}
Win Rate: ${winRate}%
Total P&L: $${totalPnL.toFixed(2)}
═══════════════════════════════════════════`);
    } catch (error) {
      console.error('Error processing trades:', error);
      process.exit(1);
    }
  }
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});