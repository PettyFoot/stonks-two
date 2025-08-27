#!/usr/bin/env tsx

/**
 * Fix Trade-Order Data Integrity Script
 * 
 * This script fixes data integrity issues between trades and orders.
 * Specifically addresses the issue where ordersInTrade array doesn't match
 * orders linked via tradeId foreign key.
 * 
 * Usage:
 * npm run tsx scripts/fix-trade-order-data.ts
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 Starting trade-order data integrity fix...\n');

  try {
    // Step 1: Run the investigation query to identify issues
    console.log('📊 Analyzing current data integrity issues...');
    
    const investigationQuery = `
      WITH trade_order_analysis AS (
        SELECT 
          t.id as trade_id,
          t.symbol,
          t.date,
          t."userId",
          t.status,
          t."ordersInTrade",
          array_length(t."ordersInTrade", 1) as orders_in_trade_count,
          COUNT(o.id) as linked_orders_count,
          array_agg(o.id ORDER BY o."orderExecutedTime") as linked_order_ids
        FROM trades t
        LEFT JOIN orders o ON o."tradeId" = t.id
        WHERE t."isCalculated" = true
        GROUP BY t.id, t.symbol, t.date, t."userId", t.status, t."ordersInTrade"
      )
      SELECT 
        COUNT(*) as total_calculated_trades,
        COUNT(*) FILTER (WHERE COALESCE(orders_in_trade_count, 0) != linked_orders_count) as inconsistent_trades,
        COUNT(*) FILTER (WHERE orders_in_trade_count > linked_orders_count) as missing_linked_orders,
        COUNT(*) FILTER (WHERE orders_in_trade_count < linked_orders_count) as extra_linked_orders
      FROM trade_order_analysis;
    `;

    const preFixStats = await prisma.$queryRawUnsafe(investigationQuery) as any[];
    const stats = preFixStats[0];

    console.log('📈 Current Statistics:');
    console.log(`  Total calculated trades: ${stats.total_calculated_trades}`);
    console.log(`  Inconsistent trades: ${stats.inconsistent_trades}`);
    console.log(`  Trades missing linked orders: ${stats.missing_linked_orders}`);
    console.log(`  Trades with extra linked orders: ${stats.extra_linked_orders}`);

    if (stats.inconsistent_trades === 0) {
      console.log('\n✅ No data integrity issues found. All trade-order relationships are consistent!');
      return;
    }

    // Step 2: Show specific problematic trades (limited to 10 for readability)
    console.log('\n🔍 Sample of problematic trades:');
    const problemTradesQuery = `
      WITH trade_order_analysis AS (
        SELECT 
          t.id as trade_id,
          t.symbol,
          t.date::date,
          t.status,
          t."ordersInTrade",
          array_length(t."ordersInTrade", 1) as orders_in_trade_count,
          COUNT(o.id) as linked_orders_count,
          array_agg(o.id ORDER BY o."orderExecutedTime") as linked_order_ids
        FROM trades t
        LEFT JOIN orders o ON o."tradeId" = t.id
        WHERE t."isCalculated" = true
        GROUP BY t.id, t.symbol, t.date, t.status, t."ordersInTrade"
      )
      SELECT 
        trade_id,
        symbol,
        date,
        status,
        orders_in_trade_count,
        linked_orders_count,
        CASE 
          WHEN orders_in_trade_count IS NULL AND linked_orders_count > 0 THEN 'Missing ordersInTrade array'
          WHEN orders_in_trade_count > linked_orders_count THEN 'Missing linked orders'
          WHEN orders_in_trade_count < linked_orders_count THEN 'Extra linked orders'
        END as issue_type
      FROM trade_order_analysis
      WHERE 
        COALESCE(orders_in_trade_count, 0) != linked_orders_count
      ORDER BY date DESC, symbol
      LIMIT 10;
    `;

    const problemTrades = await prisma.$queryRawUnsafe(problemTradesQuery) as any[];
    
    problemTrades.forEach(trade => {
      console.log(`  - ${trade.symbol} (${trade.date}) [${trade.issue_type}]: ${trade.orders_in_trade_count || 0} in array vs ${trade.linked_orders_count} linked`);
    });

    // Step 3: Apply fixes
    console.log('\n🔧 Applying fixes...');

    // Fix 1: Update missing tradeId values
    const fixMissingTradeIds = `
      UPDATE orders 
      SET "tradeId" = subquery.trade_id,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM (
        SELECT DISTINCT
          t.id as trade_id,
          unnest(t."ordersInTrade") as order_id
        FROM trades t
        WHERE t."isCalculated" = true
          AND array_length(t."ordersInTrade", 1) > 0
      ) as subquery
      WHERE orders.id = subquery.order_id
        AND (orders."tradeId" IS NULL OR orders."tradeId" != subquery.trade_id)
        AND orders."orderExecutedTime" IS NOT NULL
        AND orders."orderCancelledTime" IS NULL
        AND EXISTS (SELECT 1 FROM trades WHERE id = subquery.trade_id);
    `;

    const fixedOrdersResult = await prisma.$executeRawUnsafe(fixMissingTradeIds);
    console.log(`  ✅ Fixed tradeId for ${fixedOrdersResult} orders`);

    // Fix 2: Clean up ordersInTrade arrays
    const cleanOrdersInTrade = `
      UPDATE trades
      SET "ordersInTrade" = (
        SELECT CASE 
          WHEN array_agg(order_id) FILTER (WHERE order_id IS NOT NULL) IS NOT NULL 
          THEN array_agg(order_id) FILTER (WHERE order_id IS NOT NULL)
          ELSE '{}'::text[]
        END
        FROM unnest("ordersInTrade") AS order_id
        WHERE EXISTS (
          SELECT 1 FROM orders 
          WHERE id = order_id 
            AND "orderExecutedTime" IS NOT NULL 
            AND "orderCancelledTime" IS NULL
        )
      ),
      "updatedAt" = CURRENT_TIMESTAMP
      WHERE "isCalculated" = true
        AND array_length("ordersInTrade", 1) > 0;
    `;

    const cleanedTradesResult = await prisma.$executeRawUnsafe(cleanOrdersInTrade);
    console.log(`  ✅ Cleaned ordersInTrade arrays for ${cleanedTradesResult} trades`);

    // Fix 3: Update ordersCount
    const updateOrdersCount = `
      UPDATE trades
      SET "ordersCount" = (
        SELECT COUNT(*)
        FROM orders o
        WHERE o."tradeId" = trades.id
          AND o."orderExecutedTime" IS NOT NULL
          AND o."orderCancelledTime" IS NULL
      ),
      "updatedAt" = CURRENT_TIMESTAMP
      WHERE "isCalculated" = true;
    `;

    const updatedCountResult = await prisma.$executeRawUnsafe(updateOrdersCount);
    console.log(`  ✅ Updated ordersCount for ${updatedCountResult} trades`);

    // Step 4: Verify fixes
    console.log('\n🔍 Verifying fixes...');
    const postFixStats = await prisma.$queryRawUnsafe(investigationQuery) as any[];
    const newStats = postFixStats[0];

    console.log('📈 Post-Fix Statistics:');
    console.log(`  Total calculated trades: ${newStats.total_calculated_trades}`);
    console.log(`  Inconsistent trades: ${newStats.inconsistent_trades} (was ${stats.inconsistent_trades})`);
    console.log(`  Trades missing linked orders: ${newStats.missing_linked_orders} (was ${stats.missing_linked_orders})`);
    console.log(`  Trades with extra linked orders: ${newStats.extra_linked_orders} (was ${stats.extra_linked_orders})`);

    if (newStats.inconsistent_trades === 0) {
      console.log('\n🎉 SUCCESS: All trade-order relationships are now consistent!');
    } else {
      console.log(`\n⚠️  WARNING: ${newStats.inconsistent_trades} trades still have inconsistent relationships`);
      console.log('   You may need to run additional manual fixes or investigate further.');
    }

  } catch (error) {
    console.error('❌ Error during fix process:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n✅ Trade-order data integrity fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix process failed:', error);
    process.exit(1);
  });