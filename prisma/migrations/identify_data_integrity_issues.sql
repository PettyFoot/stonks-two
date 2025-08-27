-- SQL queries to identify and analyze data integrity issues
-- between Trade.ordersInTrade array and Order.tradeId relationships

-- ====================================================================================
-- 1. IDENTIFY TRADES WITH MISMATCHED RELATIONSHIPS
-- ====================================================================================

-- Find all calculated trades with potential data integrity issues
-- This query compares the ordersInTrade array length with actual linked orders
WITH trade_order_counts AS (
  SELECT 
    t.id as trade_id,
    t.symbol,
    t.status,
    t."ordersInTrade",
    COALESCE(array_length(t."ordersInTrade", 1), 0) as orders_in_array_count,
    COUNT(o.id) as linked_orders_count,
    array_agg(o.id ORDER BY o."orderExecutedTime") FILTER (WHERE o.id IS NOT NULL) as linked_order_ids
  FROM trades t
  LEFT JOIN orders o ON o."tradeId" = t.id
  WHERE t."isCalculated" = true
  GROUP BY t.id, t.symbol, t.status, t."ordersInTrade"
)
SELECT 
  trade_id,
  symbol,
  status,
  orders_in_array_count,
  linked_orders_count,
  orders_in_array_count - linked_orders_count as count_difference,
  "ordersInTrade" as orders_in_array,
  linked_order_ids,
  CASE 
    WHEN orders_in_array_count > linked_orders_count THEN 'MISSING_TRADE_IDS'
    WHEN orders_in_array_count < linked_orders_count THEN 'EXTRA_TRADE_IDS' 
    WHEN orders_in_array_count = 0 AND linked_orders_count > 0 THEN 'EMPTY_ARRAY_WITH_LINKED_ORDERS'
    ELSE 'CONSISTENT'
  END as issue_type
FROM trade_order_counts
WHERE orders_in_array_count != linked_orders_count
ORDER BY ABS(orders_in_array_count - linked_orders_count) DESC, symbol;

-- ====================================================================================
-- 2. FOCUS ON GOOG TRADE SPECIFICALLY
-- ====================================================================================

-- Detailed analysis of GOOG trade mentioned in the issue
SELECT 
  t.id as trade_id,
  t.symbol,
  t.status,
  t."ordersInTrade",
  COALESCE(array_length(t."ordersInTrade", 1), 0) as orders_in_array_count,
  t."createdAt",
  t."updatedAt"
FROM trades t
WHERE t.symbol = 'GOOG' 
  AND t."isCalculated" = true
  AND t."ordersInTrade" IS NOT NULL
  AND array_length(t."ordersInTrade", 1) > 0;

-- Check if the GOOG orders exist and their tradeId status
SELECT 
  o.id,
  o."orderId", 
  o.symbol,
  o.side,
  o."orderQuantity",
  o."limitPrice",
  o."orderExecutedTime",
  o."tradeId",
  CASE 
    WHEN o."tradeId" IS NULL THEN 'MISSING_TRADE_ID'
    ELSE 'HAS_TRADE_ID'
  END as trade_id_status
FROM orders o
WHERE o.id = ANY(ARRAY['cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf'])
ORDER BY o."orderExecutedTime";

-- ====================================================================================
-- 3. FIND ALL ORDERS THAT SHOULD BELONG TO TRADES BUT DON'T
-- ====================================================================================

-- Find orders that are in ordersInTrade arrays but don't have tradeId set
SELECT DISTINCT
  unnest(t."ordersInTrade") as order_id,
  t.id as trade_id,
  t.symbol as trade_symbol
FROM trades t
WHERE t."isCalculated" = true
  AND t."ordersInTrade" IS NOT NULL
  AND array_length(t."ordersInTrade", 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = unnest(t."ordersInTrade") 
    AND o."tradeId" = t.id
  );

-- ====================================================================================
-- 4. SUMMARY STATISTICS
-- ====================================================================================

-- Overall data integrity summary
SELECT 
  'TOTAL_CALCULATED_TRADES' as metric,
  COUNT(*) as count
FROM trades 
WHERE "isCalculated" = true

UNION ALL

SELECT 
  'TRADES_WITH_ORDERS_IN_ARRAY' as metric,
  COUNT(*) as count
FROM trades 
WHERE "isCalculated" = true 
  AND "ordersInTrade" IS NOT NULL 
  AND array_length("ordersInTrade", 1) > 0

UNION ALL

SELECT 
  'TRADES_WITH_LINKED_ORDERS' as metric,
  COUNT(DISTINCT t.id) as count
FROM trades t
INNER JOIN orders o ON o."tradeId" = t.id
WHERE t."isCalculated" = true

UNION ALL

SELECT 
  'ORDERS_WITH_TRADE_ID_SET' as metric,
  COUNT(*) as count
FROM orders 
WHERE "tradeId" IS NOT NULL;