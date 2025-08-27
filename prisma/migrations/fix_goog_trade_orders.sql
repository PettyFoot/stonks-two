-- Fix GOOG Trade Orders - Update missing tradeId values
-- This addresses the specific issue where GOOG trade has 2 order IDs in ordersInTrade 
-- but only 1 order is actually linked via tradeId

-- First, let's identify the problematic GOOG trade and orders
-- Run this to understand the current state:
/*
SELECT 
  t.id as trade_id,
  t.symbol,
  t.date,
  t."ordersInTrade",
  array_length(t."ordersInTrade", 1) as orders_in_array,
  o.id as linked_order_id,
  o."orderId" as external_order_id,
  o."tradeId" as current_trade_id
FROM trades t
LEFT JOIN orders o ON o."tradeId" = t.id
WHERE t.symbol = 'GOOG' AND t."isCalculated" = true
ORDER BY t.date DESC;
*/

-- Fix 1: Update orders that are in the ordersInTrade array but missing tradeId
UPDATE orders 
SET "tradeId" = subquery.trade_id
FROM (
  SELECT DISTINCT
    t.id as trade_id,
    unnest(t."ordersInTrade") as order_id
  FROM trades t
  WHERE t.symbol = 'GOOG' 
    AND t."isCalculated" = true
    AND array_length(t."ordersInTrade", 1) > 0
) as subquery
WHERE orders.id = subquery.order_id
  AND (orders."tradeId" IS NULL OR orders."tradeId" != subquery.trade_id)
  AND orders."orderExecutedTime" IS NOT NULL  -- Only update executed orders
  AND orders."orderCancelledTime" IS NULL;    -- Don't update cancelled orders

-- Fix 2: For orders with the specific IDs mentioned in the issue
-- Update the specific GOOG trade order IDs: ["cmetf1evu0015uauwcklfq9lb", "cmetf1ewt0017uauwwloerczf"]
UPDATE orders 
SET "tradeId" = (
  SELECT t.id 
  FROM trades t 
  WHERE 'cmetf1evu0015uauwcklfq9lb' = ANY(t."ordersInTrade") 
    AND 'cmetf1ewt0017uauwwloerczf' = ANY(t."ordersInTrade")
    AND t.symbol = 'GOOG'
    AND t."isCalculated" = true
  LIMIT 1
)
WHERE orders.id IN ('cmetf1evu0015uauwcklfq9lb', 'cmetf1ewt0017uauwwloerczf')
  AND orders."orderExecutedTime" IS NOT NULL
  AND orders."orderCancelledTime" IS NULL
  AND orders."tradeId" IS NULL;

-- Verification query - run after the fixes to confirm they worked
/*
SELECT 
  t.id as trade_id,
  t.symbol,
  t.date,
  t.status,
  t."ordersInTrade",
  array_length(t."ordersInTrade", 1) as orders_in_array_count,
  COUNT(o.id) as linked_orders_count,
  array_agg(o.id ORDER BY o."orderExecutedTime") as linked_order_ids,
  array_agg(o."orderId" ORDER BY o."orderExecutedTime") as external_order_ids,
  CASE 
    WHEN array_length(t."ordersInTrade", 1) = COUNT(o.id) THEN 'FIXED ✓'
    ELSE 'STILL BROKEN ✗'
  END as status
FROM trades t
LEFT JOIN orders o ON o."tradeId" = t.id
WHERE t.symbol = 'GOOG' AND t."isCalculated" = true
GROUP BY t.id, t.symbol, t.date, t.status, t."ordersInTrade"
ORDER BY t.date DESC;
*/