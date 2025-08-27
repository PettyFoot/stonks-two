-- SQL script to fix data integrity issues between Trade.ordersInTrade and Order.tradeId
-- 
-- IMPORTANT: Run the identify_data_integrity_issues.sql first to understand the scope
-- of issues before running this fix script.
--
-- This script will:
-- 1. Fix the specific GOOG trade mentioned in the issue
-- 2. Fix all similar issues where orders in ordersInTrade array don't have tradeId set
-- 3. Provide verification queries to confirm fixes

-- ====================================================================================
-- BACKUP RECOMMENDATION
-- ====================================================================================
-- Before running these fixes, create a backup:
-- pg_dump -t orders -t trades your_database > backup_before_trade_fix.sql

-- ====================================================================================
-- 1. FIX SPECIFIC GOOG TRADE ISSUE
-- ====================================================================================

-- First, let's see the current state of GOOG trade orders
-- (This is a SELECT to show what we're about to fix)
SELECT 
  'BEFORE_FIX' as status,
  o.id,
  o."orderId", 
  o.symbol,
  o.side,
  o."orderQuantity",
  o."limitPrice",
  o."orderExecutedTime",
  o."tradeId"
FROM orders o
WHERE o.id = ANY(ARRAY['cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf']);

-- Find the GOOG trade that contains these orders
WITH goog_trade AS (
  SELECT id, symbol, "ordersInTrade"
  FROM trades 
  WHERE symbol = 'GOOG' 
    AND "isCalculated" = true
    AND "ordersInTrade" @> ARRAY['cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf']
  LIMIT 1
)
SELECT 
  'GOOG_TRADE_INFO' as info_type,
  gt.id as trade_id,
  gt.symbol,
  gt."ordersInTrade",
  array_length(gt."ordersInTrade", 1) as orders_count
FROM goog_trade gt;

-- Fix the GOOG trade by setting tradeId on the orders
-- This will find the GOOG trade and update the missing tradeId values
WITH goog_trade AS (
  SELECT id
  FROM trades 
  WHERE symbol = 'GOOG' 
    AND "isCalculated" = true
    AND "ordersInTrade" @> ARRAY['cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf']
  LIMIT 1
)
UPDATE orders 
SET "tradeId" = (SELECT id FROM goog_trade)
WHERE id = ANY(ARRAY['cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf'])
  AND "tradeId" IS NULL;

-- ====================================================================================
-- 2. FIX ALL SIMILAR ISSUES SYSTEMATICALLY
-- ====================================================================================

-- Create a temporary function to fix all mismatched relationships
-- This will update all orders that are listed in ordersInTrade but don't have tradeId set

DO $$
DECLARE
    trade_record RECORD;
    order_id TEXT;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all trades with ordersInTrade array
    FOR trade_record IN 
        SELECT id, symbol, "ordersInTrade"
        FROM trades 
        WHERE "isCalculated" = true 
          AND "ordersInTrade" IS NOT NULL 
          AND array_length("ordersInTrade", 1) > 0
    LOOP
        -- Loop through each order in the ordersInTrade array
        FOREACH order_id IN ARRAY trade_record."ordersInTrade"
        LOOP
            -- Update the order if it doesn't have tradeId set or has wrong tradeId
            UPDATE orders 
            SET "tradeId" = trade_record.id
            WHERE id = order_id 
              AND ("tradeId" IS NULL OR "tradeId" != trade_record.id);
            
            GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Fixed % order records with missing or incorrect tradeId', updated_count;
END $$;

-- ====================================================================================
-- 3. VERIFICATION QUERIES
-- ====================================================================================

-- Verify the GOOG trade fix specifically
SELECT 
  'AFTER_GOOG_FIX' as status,
  o.id,
  o."orderId", 
  o.symbol,
  o.side,
  o."orderQuantity",
  o."limitPrice",
  o."orderExecutedTime",
  o."tradeId",
  CASE WHEN o."tradeId" IS NOT NULL THEN 'FIXED' ELSE 'STILL_MISSING' END as fix_status
FROM orders o
WHERE o.id = ANY(ARRAY['cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf'])
ORDER BY o."orderExecutedTime";

-- Verify overall fix - should return no rows if everything is fixed
WITH trade_order_counts AS (
  SELECT 
    t.id as trade_id,
    t.symbol,
    COALESCE(array_length(t."ordersInTrade", 1), 0) as orders_in_array_count,
    COUNT(o.id) as linked_orders_count
  FROM trades t
  LEFT JOIN orders o ON o."tradeId" = t.id
  WHERE t."isCalculated" = true
  GROUP BY t.id, t.symbol, t."ordersInTrade"
)
SELECT 
  'REMAINING_ISSUES' as check_type,
  trade_id,
  symbol,
  orders_in_array_count,
  linked_orders_count,
  orders_in_array_count - linked_orders_count as count_difference
FROM trade_order_counts
WHERE orders_in_array_count != linked_orders_count;

-- Final summary after fixes
SELECT 
  'FIXED_STATISTICS' as summary_type,
  COUNT(DISTINCT t.id) as trades_with_orders,
  COUNT(o.id) as total_linked_orders,
  COUNT(DISTINCT o.id) as unique_linked_orders
FROM trades t
INNER JOIN orders o ON o."tradeId" = t.id
WHERE t."isCalculated" = true;

-- ====================================================================================
-- 4. OPTIONAL: CLEANUP RECOMMENDATIONS
-- ====================================================================================

-- After confirming the fixes work, you may want to consider:
-- 1. Adding constraints to prevent future inconsistencies
-- 2. Creating triggers to keep ordersInTrade and tradeId in sync
-- 3. Eventually deprecating ordersInTrade array in favor of tradeId relationship

-- Example constraint (run only after confirming all data is consistent):
-- ALTER TABLE orders ADD CONSTRAINT orders_trade_consistency 
-- CHECK ("tradeId" IS NULL OR EXISTS (SELECT 1 FROM trades WHERE id = "tradeId"));

COMMIT;