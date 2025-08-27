-- Journal Page Feature Migration
-- Adds BLANK trade status and optimizes indexes for journal queries

-- Add BLANK status to TradeStatus enum
ALTER TYPE "trade_status" ADD VALUE IF NOT EXISTS 'BLANK';

-- Add optimized compound indexes for journal page queries
-- These indexes will significantly improve performance when querying trades by date and status
CREATE INDEX IF NOT EXISTS idx_trades_journal_status_date 
ON trades(user_id, status, date) 
WHERE status IN ('OPEN', 'CLOSED', 'BLANK');

CREATE INDEX IF NOT EXISTS idx_trades_journal_date_status 
ON trades(user_id, date, status) 
WHERE status IN ('OPEN', 'CLOSED', 'BLANK');

-- Optimize Order model for journal queries fetching orders by trade
CREATE INDEX IF NOT EXISTS idx_orders_user_trade 
ON orders(user_id, trade_id) 
WHERE trade_id IS NOT NULL;

-- Add partial index for BLANK trades specifically (journal entries with notes only)
CREATE INDEX IF NOT EXISTS idx_trades_blank_entries 
ON trades(user_id, date, notes) 
WHERE status = 'BLANK' AND notes IS NOT NULL;

-- Add index for date-based journal queries across all trade statuses
CREATE INDEX IF NOT EXISTS idx_trades_journal_date_all 
ON trades(user_id, date DESC, status, created_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE trades;
ANALYZE orders;

-- Comments for documentation
COMMENT ON INDEX idx_trades_journal_status_date IS 'Optimizes journal page queries filtering by status and date';
COMMENT ON INDEX idx_trades_journal_date_status IS 'Alternative compound index for date-first journal queries';
COMMENT ON INDEX idx_orders_user_trade IS 'Optimizes fetching orders for specific trades in journal view';
COMMENT ON INDEX idx_trades_blank_entries IS 'Fast lookup for blank journal entries with notes';
COMMENT ON INDEX idx_trades_journal_date_all IS 'Comprehensive index for journal page date-based queries';