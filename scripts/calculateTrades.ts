#!/usr/bin/env tsx
/**
 * Standalone script to calculate trades from orders
 * Run with: npx tsx scripts/calculateTrades.ts [userId]
 */

import { PrismaClient } from '@prisma/client';
import { tradeCalculationService } from '../src/services/tradeCalculation';

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
        const trades = await tradeCalculationService.buildTrades(user.id);
        console.log(`✓ Calculated ${trades.length} trades for ${user.email}`);
        
        // Display summary
        const totalPnL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
        const winners = trades.filter(t => t.profitLoss > 0).length;
        const losers = trades.filter(t => t.profitLoss < 0).length;
        
        console.log(`  Summary: ${winners}W/${losers}L, Total P&L: $${totalPnL.toFixed(2)}`);
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
      const trades = await tradeCalculationService.buildTrades(userId);
      console.log(`✓ Calculated ${trades.length} trades for ${user.email}`);
      
      // Display detailed results
      console.log('\nCalculated Trades:');
      console.log('═══════════════════════════════════════════');
      
      for (const trade of trades) {
        console.log(`
Symbol: ${trade.symbol}
Side: ${trade.side}
Quantity: ${trade.quantity}
Cost Basis: $${trade.costBasis.toFixed(2)}
Proceeds: $${trade.proceeds.toFixed(2)}
P&L: $${trade.profitLoss.toFixed(2)} ${trade.profitLoss >= 0 ? '✓' : '✗'}
Orders: ${trade.ordersCount} orders
───────────────────────────────────────────`);
      }
      
      // Summary
      const totalPnL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
      const winners = trades.filter(t => t.profitLoss > 0).length;
      const losers = trades.filter(t => t.profitLoss < 0).length;
      const winRate = trades.length > 0 ? (winners / trades.length * 100).toFixed(1) : 0;
      
      console.log(`
═══════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════
Total Trades: ${trades.length}
Winners: ${winners}
Losers: ${losers}
Win Rate: ${winRate}%
Total P&L: $${totalPnL.toFixed(2)}
═══════════════════════════════════════════`);
    } catch (error) {
      console.error('Error calculating trades:', error);
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