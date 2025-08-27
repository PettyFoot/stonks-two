-- Comprehensive Trade-Order Data Integrity Fix
-- This script fixes all data integrity issues between trades and orders
-- Run this script to ensure ordersInTrade array and Order.tradeId relationships are consistent

BEGIN;

-- Step 1: Log current state before fixes
CREATE TEMP TABLE pre_fix_stats AS
WITH trade_order_analysis AS (
  SELECT 
    t.id as trade_id,
    t.symbol,
    t.date,
    t.status,
    array_length(t."ordersInTrade", 1) as orders_in_trade_count,
    COUNT(o.id) as linked_orders_count
  FROM trades t
  LEFT JOIN orders o ON o."tradeId" = t.id
  WHERE t."isCalculated" = true
  GROUP BY t.id, t.symbol, t.date, t.status, t."ordersInTrade"
)
SELECT 
  COUNT(*) as total_calculated_trades,
  COUNT(*) FILTER (WHERE COALESCE(orders_in_trade_count, 0) != linked_orders_count) as inconsistent_trades,
  COUNT(*) FILTER (WHERE orders_in_trade_count > linked_orders_count) as missing_linked_orders,
  COUNT(*) FILTER (WHERE orders_in_trade_count < linked_orders_count) as extra_linked_orders
FROM trade_order_analysis;

-- Display pre-fix stats
DO $$
DECLARE
    stats RECORD;
BEGIN
    SELECT * INTO stats FROM pre_fix_stats;
    RAISE NOTICE 'PRE-FIX STATISTICS:';
    RAISE NOTICE '  Total calculated trades: %', stats.total_calculated_trades;
    RAISE NOTICE '  Inconsistent trades: %', stats.inconsistent_trades;
    RAISE NOTICE '  Trades missing linked orders: %', stats.missing_linked_orders;
    RAISE NOTICE '  Trades with extra linked orders: %', stats.extra_linked_orders;
END $$;

-- Step 2: Fix missing tradeId values for orders in ordersInTrade arrays
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
  AND orders."orderExecutedTime" IS NOT NULL  -- Only executed orders
  AND orders."orderCancelledTime" IS NULL     -- Not cancelled orders
  AND EXISTS (SELECT 1 FROM trades WHERE id = subquery.trade_id); -- Trade still exists

-- Step 3: Clean up ordersInTrade arrays to remove non-existent order IDs
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

-- Step 4: Update ordersCount to match actual linked orders
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

-- Step 5: Post-fix verification
CREATE TEMP TABLE post_fix_stats AS
WITH trade_order_analysis AS (
  SELECT 
    t.id as trade_id,
    t.symbol,
    t.date,
    t.status,
    array_length(t."ordersInTrade", 1) as orders_in_trade_count,
    COUNT(o.id) as linked_orders_count
  FROM trades t
  LEFT JOIN orders o ON o."tradeId" = t.id
  WHERE t."isCalculated" = true
  GROUP BY t.id, t.symbol, t.date, t.status, t."ordersInTrade"
)
SELECT 
  COUNT(*) as total_calculated_trades,
  COUNT(*) FILTER (WHERE COALESCE(orders_in_trade_count, 0) != linked_orders_count) as inconsistent_trades,
  COUNT(*) FILTER (WHERE orders_in_trade_count > linked_orders_count) as missing_linked_orders,
  COUNT(*) FILTER (WHERE orders_in_trade_count < linked_orders_count) as extra_linked_orders
FROM trade_order_analysis;

-- Display results
DO $$
DECLARE
    pre_stats RECORD;
    post_stats RECORD;
BEGIN
    SELECT * INTO pre_stats FROM pre_fix_stats;
    SELECT * INTO post_stats FROM post_fix_stats;
    
    RAISE NOTICE '';
    RAISE NOTICE 'POST-FIX STATISTICS:';
    RAISE NOTICE '  Total calculated trades: %', post_stats.total_calculated_trades;
    RAISE NOTICE '  Inconsistent trades: % (was %)', post_stats.inconsistent_trades, pre_stats.inconsistent_trades;
    RAISE NOTICE '  Trades missing linked orders: % (was %)', post_stats.missing_linked_orders, pre_stats.missing_linked_orders;
    RAISE NOTICE '  Trades with extra linked orders: % (was %)', post_stats.extra_linked_orders, pre_stats.extra_linked_orders;
    
    IF post_stats.inconsistent_trades = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✓ SUCCESS: All trade-order relationships are now consistent!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠ WARNING: % trades still have inconsistent relationships', post_stats.inconsistent_trades;
    END IF;
END $$;

-- Clean up temp tables
DROP TABLE pre_fix_stats;
DROP TABLE post_fix_stats;

COMMIT;