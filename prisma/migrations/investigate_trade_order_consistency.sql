-- Database Query to Identify Trade-Order Data Integrity Issues
-- This query finds trades where the ordersInTrade array count doesn't match actual linked orders via tradeId

-- 1. Find all trades with mismatched order counts
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
    array_agg(o.id ORDER BY o."orderExecutedTime") as linked_order_ids,
    array_agg(o."orderId" ORDER BY o."orderExecutedTime") as linked_external_order_ids
  FROM trades t
  LEFT JOIN orders o ON o."tradeId" = t.id
  WHERE t."isCalculated" = true
  GROUP BY t.id, t.symbol, t.date, t."userId", t.status, t."ordersInTrade"
)
SELECT 
  trade_id,
  symbol,
  date,
  "userId",
  status,
  "ordersInTrade",
  orders_in_trade_count,
  linked_orders_count,
  linked_order_ids,
  linked_external_order_ids,
  CASE 
    WHEN orders_in_trade_count IS NULL AND linked_orders_count > 0 THEN 'Missing ordersInTrade array'
    WHEN orders_in_trade_count > linked_orders_count THEN 'Missing linked orders'
    WHEN orders_in_trade_count < linked_orders_count THEN 'Extra linked orders'
    ELSE 'Counts match'
  END as issue_type
FROM trade_order_analysis
WHERE 
  COALESCE(orders_in_trade_count, 0) != linked_orders_count
ORDER BY date DESC, symbol;

-- 2. Specifically check for the GOOG trade mentioned in the issue
SELECT 
  t.id as trade_id,
  t.symbol,
  t.date,
  t.status,
  t."ordersInTrade",
  array_length(t."ordersInTrade", 1) as orders_in_trade_count,
  COUNT(o.id) as linked_orders_count,
  array_agg(o.id ORDER BY o."orderExecutedTime") as linked_order_ids,
  array_agg(o."orderId" ORDER BY o."orderExecutedTime") as linked_external_order_ids
FROM trades t
LEFT JOIN orders o ON o."tradeId" = t.id
WHERE t.symbol = 'GOOG' AND t."isCalculated" = true
GROUP BY t.id, t.symbol, t.date, t.status, t."ordersInTrade"
ORDER BY t.date DESC;

-- 3. Find orphaned orders that exist in ordersInTrade array but don't have tradeId set
SELECT DISTINCT
  unnest(t."ordersInTrade") as order_id_in_array,
  o.id as actual_order_id,
  o."tradeId" as current_trade_id,
  t.id as expected_trade_id,
  t.symbol,
  t.date,
  CASE 
    WHEN o.id IS NULL THEN 'Order not found in database'
    WHEN o."tradeId" IS NULL THEN 'Order missing tradeId'
    WHEN o."tradeId" != t.id THEN 'Order linked to different trade'
    ELSE 'Correctly linked'
  END as status
FROM trades t
LEFT JOIN orders o ON o.id = unnest(t."ordersInTrade")
WHERE 
  array_length(t."ordersInTrade", 1) > 0 
  AND t."isCalculated" = true
  AND (o.id IS NULL OR o."tradeId" IS NULL OR o."tradeId" != t.id)
ORDER BY t.date DESC, t.symbol;