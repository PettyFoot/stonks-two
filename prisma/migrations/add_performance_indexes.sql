-- Performance Optimization Indexes for Trade Analytics
-- These indexes significantly improve query performance for aggregation functions

-- Composite index for win/loss calculations with filters
CREATE INDEX IF NOT EXISTS idx_trades_winloss_analysis 
ON trades(user_id, status, exit_date, symbol, side) 
WHERE status = 'CLOSED';

-- Index for P&L aggregations
CREATE INDEX IF NOT EXISTS idx_trades_pnl_analysis 
ON trades(user_id, pnl, exit_date) 
WHERE status = 'CLOSED' AND exit_date IS NOT NULL;

-- Index for time-based aggregations
CREATE INDEX IF NOT EXISTS idx_trades_time_analysis 
ON trades(user_id, exit_date, entry_date, time_in_trade) 
WHERE status = 'CLOSED';

-- Index for symbol-specific queries
CREATE INDEX IF NOT EXISTS idx_trades_symbol_performance 
ON trades(user_id, symbol, pnl, exit_date) 
WHERE status = 'CLOSED';

-- Index for drawdown calculations (cumulative P&L)
CREATE INDEX IF NOT EXISTS idx_trades_cumulative 
ON trades(user_id, exit_date, pnl) 
WHERE status = 'CLOSED' AND exit_date IS NOT NULL
ORDER BY exit_date;

-- Index for duration-based analysis
CREATE INDEX IF NOT EXISTS idx_trades_duration 
ON trades(user_id, time_in_trade, pnl) 
WHERE status = 'CLOSED' AND time_in_trade IS NOT NULL;

-- Index for price range analysis
CREATE INDEX IF NOT EXISTS idx_trades_price_analysis 
ON trades(user_id, avg_entry_price, avg_exit_price, pnl) 
WHERE status = 'CLOSED';

-- Index for volume analysis
CREATE INDEX IF NOT EXISTS idx_trades_volume 
ON trades(user_id, quantity, pnl) 
WHERE status = 'CLOSED';

-- Partial index for winning trades
CREATE INDEX IF NOT EXISTS idx_trades_wins 
ON trades(user_id, exit_date, pnl) 
WHERE status = 'CLOSED' AND pnl > 0;

-- Partial index for losing trades
CREATE INDEX IF NOT EXISTS idx_trades_losses 
ON trades(user_id, exit_date, pnl) 
WHERE status = 'CLOSED' AND pnl < 0;

-- Index for MFE/MAE calculations
CREATE INDEX IF NOT EXISTS idx_trades_mfe_mae 
ON trades(user_id, high_during_trade, low_during_trade, avg_entry_price, side) 
WHERE status = 'CLOSED' 
  AND high_during_trade IS NOT NULL 
  AND low_during_trade IS NOT NULL;

-- Index for date range queries (common filter)
CREATE INDEX IF NOT EXISTS idx_trades_date_range 
ON trades(user_id, entry_date, exit_date) 
WHERE status = 'CLOSED';

-- BRIN index for very large date-ordered datasets
-- More efficient than B-tree for append-only time-series data
CREATE INDEX IF NOT EXISTS idx_trades_exit_date_brin 
ON trades USING BRIN(exit_date) 
WHERE status = 'CLOSED' AND exit_date IS NOT NULL;

-- Analyze tables to update statistics for query planner
ANALYZE trades;

-- Create materialized view for frequently accessed daily statistics
-- This can significantly speed up dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_trade_stats AS
SELECT 
  user_id,
  DATE(exit_date) as trade_date,
  COUNT(*) as trade_count,
  SUM(pnl::NUMERIC) as total_pnl,
  AVG(pnl::NUMERIC) as avg_pnl,
  COUNT(*) FILTER (WHERE pnl > 0) as wins,
  COUNT(*) FILTER (WHERE pnl < 0) as losses,
  SUM(pnl::NUMERIC) FILTER (WHERE pnl > 0) as gross_profit,
  SUM(ABS(pnl::NUMERIC)) FILTER (WHERE pnl < 0) as gross_loss,
  MAX(pnl::NUMERIC) as best_trade,
  MIN(pnl::NUMERIC) as worst_trade,
  SUM(quantity) as total_volume,
  AVG(time_in_trade) as avg_hold_time
FROM trades
WHERE status = 'CLOSED' AND exit_date IS NOT NULL
GROUP BY user_id, DATE(exit_date);

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_daily_stats 
ON mv_daily_trade_stats(user_id, trade_date);

-- Function to refresh materialized view (call periodically or after batch imports)
CREATE OR REPLACE FUNCTION refresh_daily_trade_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_trade_stats;
END;
$$ LANGUAGE plpgsql;

-- Comment on indexes for documentation
COMMENT ON INDEX idx_trades_winloss_analysis IS 'Optimizes win/loss ratio and expectation calculations';
COMMENT ON INDEX idx_trades_pnl_analysis IS 'Optimizes P&L aggregation queries';
COMMENT ON INDEX idx_trades_cumulative IS 'Optimizes cumulative P&L and drawdown calculations';
COMMENT ON INDEX idx_trades_wins IS 'Fast lookup for winning trades only';
COMMENT ON INDEX idx_trades_losses IS 'Fast lookup for losing trades only';
COMMENT ON MATERIALIZED VIEW mv_daily_trade_stats IS 'Pre-aggregated daily statistics for dashboard performance';