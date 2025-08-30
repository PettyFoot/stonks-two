-- Database Optimization Script for StonksTwo
-- This script creates optimized indexes for better query performance

-- Performance-critical indexes for trades table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_status_date 
  ON trades (user_id, status, date) 
  WHERE status = 'CLOSED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_exit_date_pnl 
  ON trades (user_id, exit_date, pnl) 
  WHERE status = 'CLOSED' AND exit_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_symbol_date 
  ON trades (user_id, symbol, date) 
  WHERE status = 'CLOSED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_side_date 
  ON trades (user_id, side, date) 
  WHERE status = 'CLOSED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_time_in_trade 
  ON trades (user_id, time_in_trade) 
  WHERE status = 'CLOSED' AND time_in_trade IS NOT NULL;

-- Composite index for complex dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_dashboard_complex 
  ON trades (user_id, status, date, symbol, side, pnl, quantity, time_in_trade) 
  WHERE status = 'CLOSED';

-- Index for tag-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_tags 
  ON trades USING GIN (user_id, tags) 
  WHERE status = 'CLOSED';

-- Indexes for dayData table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_day_data_user_date 
  ON "dayData" (user_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_day_data_user_pnl 
  ON "dayData" (user_id, pnl, date);

-- Partial indexes for performance by duration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_intraday 
  ON trades (user_id, date, pnl, quantity) 
  WHERE status = 'CLOSED' AND time_in_trade <= 86400;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_swing 
  ON trades (user_id, date, pnl, quantity) 
  WHERE status = 'CLOSED' AND time_in_trade > 86400;

-- Index for date range queries with better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_date_range 
  ON trades (user_id, date DESC, pnl, quantity, time_in_trade) 
  WHERE status = 'CLOSED';

-- Covering index for KPI calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_kpi_covering 
  ON trades (user_id, status, pnl, quantity, time_in_trade, date, symbol, side) 
  WHERE status = 'CLOSED';

-- Statistics for better query planning
ANALYZE trades;
ANALYZE "dayData";

-- Optional: Create materialized view for frequently accessed dashboard metrics
-- This can significantly speed up dashboard loading for users with large datasets
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_dashboard_metrics AS
SELECT 
  user_id,
  COUNT(*) as total_trades,
  SUM(pnl) as total_pnl,
  AVG(pnl) as avg_pnl,
  SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
  SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
  SUM(quantity) as total_volume,
  AVG(time_in_trade) as avg_time_in_trade,
  MAX(pnl) as max_gain,
  MIN(pnl) as min_loss,
  STDDEV(pnl) as pnl_stddev,
  MIN(date) as first_trade_date,
  MAX(date) as last_trade_date
FROM trades 
WHERE status = 'CLOSED'
GROUP BY user_id;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_metrics_user 
  ON mv_user_dashboard_metrics (user_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- Comments for maintenance
COMMENT ON INDEX idx_trades_user_status_date IS 'Primary dashboard query optimization';
COMMENT ON INDEX idx_trades_dashboard_complex IS 'Complex filtering queries';
COMMENT ON MATERIALIZED VIEW mv_user_dashboard_metrics IS 'Precomputed dashboard metrics for performance';
COMMENT ON FUNCTION refresh_dashboard_metrics IS 'Call this function after bulk trade imports';