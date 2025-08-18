-- Analytics Performance Optimization Indexes
-- These indexes are specifically designed for time-based analytics queries

-- Time-based analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_date_time ON trades(userId, date, "openTime") WHERE "openTime" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_entry_exit_dates ON trades(userId, "entryDate", "exitDate") WHERE "exitDate" IS NOT NULL;

-- Hour and day-based analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_hour_of_day ON trades(userId, EXTRACT(HOUR FROM "openTime")) WHERE "openTime" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_day_of_week ON trades(userId, EXTRACT(DOW FROM date));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_month_of_year ON trades(userId, EXTRACT(MONTH FROM date));

-- Duration and session analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_holding_period ON trades(userId, "holdingPeriod");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_market_session ON trades(userId, "marketSession");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_time_in_trade ON trades(userId, "timeInTrade") WHERE "timeInTrade" IS NOT NULL;

-- Performance analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_pnl_side ON trades(userId, pnl, side);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_status_calculated ON trades(userId, status, "isCalculated");

-- Symbol and tag analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_symbol_date ON trades(userId, symbol, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_tags_gin ON trades USING GIN(tags) WHERE array_length(tags, 1) > 0;

-- Composite indexes for common analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_analytics_comprehensive ON trades(userId, date, side, "holdingPeriod", "marketSession") 
  WHERE "isCalculated" = true AND status = 'CLOSED';

-- Partial indexes for better performance on filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_profitable ON trades(userId, date, pnl) WHERE pnl > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_losing ON trades(userId, date, pnl) WHERE pnl < 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_breakeven ON trades(userId, date) WHERE pnl = 0;

-- Indexes for aggregation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_date_pnl_quantity ON trades(userId, date, pnl, quantity) WHERE "isCalculated" = true;