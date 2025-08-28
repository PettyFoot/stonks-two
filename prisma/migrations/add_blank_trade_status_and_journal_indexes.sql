-- Records Page Feature Migration
-- Adds BLANK trade status and optimizes indexes for records queries

-- Add BLANK status to TradeStatus enum
ALTER TYPE "trade_status" ADD VALUE IF NOT EXISTS 'BLANK';

-- Add optimized compound indexes for records page queries
-- These indexes will significantly improve performance when querying trades by date and status
CREATE INDEX IF NOT EXISTS idx_trades_records_status_date 
ON trades(user_id, status, date) 
WHERE status IN ('OPEN', 'CLOSED', 'BLANK');

CREATE INDEX IF NOT EXISTS idx_trades_records_date_status 
ON trades(user_id, date, status) 
WHERE status IN ('OPEN', 'CLOSED', 'BLANK');

-- Optimize Order model for records queries fetching orders by trade
CREATE INDEX IF NOT EXISTS idx_orders_user_trade 
ON orders(user_id, trade_id) 
WHERE trade_id IS NOT NULL;

-- Add partial index for BLANK trades specifically (records entries with notes only)
CREATE INDEX IF NOT EXISTS idx_trades_blank_entries 
ON trades(user_id, date, notes) 
WHERE status = 'BLANK' AND notes IS NOT NULL;

-- Add index for date-based records queries across all trade statuses
CREATE INDEX IF NOT EXISTS idx_trades_records_date_all 
ON trades(user_id, date DESC, status, created_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE trades;
ANALYZE orders;

-- Comments for documentation
COMMENT ON INDEX idx_trades_records_status_date IS 'Optimizes records page queries filtering by status and date';
COMMENT ON INDEX idx_trades_records_date_status IS 'Alternative compound index for date-first records queries';
COMMENT ON INDEX idx_orders_user_trade IS 'Optimizes fetching orders for specific trades in records view';
COMMENT ON INDEX idx_trades_blank_entries IS 'Fast lookup for blank records entries with notes';
COMMENT ON INDEX idx_trades_records_date_all IS 'Comprehensive index for records page date-based queries';