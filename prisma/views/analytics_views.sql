-- Materialized Views for Analytics Performance
-- These views pre-calculate common aggregations to improve query performance

-- Daily trade summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_trade_summary AS
SELECT 
    "userId",
    date::date as trade_date,
    COUNT(*) as trade_count,
    SUM(pnl) as daily_pnl,
    SUM(quantity) as daily_volume,
    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
    SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
    SUM(CASE WHEN pnl = 0 THEN 1 ELSE 0 END) as breakeven_trades,
    AVG(CASE WHEN pnl > 0 THEN pnl ELSE NULL END) as avg_winning_trade,
    AVG(CASE WHEN pnl < 0 THEN pnl ELSE NULL END) as avg_losing_trade,
    MAX(pnl) as best_trade,
    MIN(pnl) as worst_trade,
    SUM(COALESCE(commission, 0) + COALESCE(fees, 0)) as total_costs
FROM trades 
WHERE "isCalculated" = true AND status = 'CLOSED'
GROUP BY "userId", date::date;

CREATE UNIQUE INDEX ON daily_trade_summary("userId", trade_date);

-- Hourly trade distribution view
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_trade_distribution AS
SELECT 
    "userId",
    EXTRACT(HOUR FROM "openTime") as hour_of_day,
    COUNT(*) as trade_count,
    SUM(pnl) as hourly_pnl,
    SUM(quantity) as hourly_volume,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
FROM trades 
WHERE "openTime" IS NOT NULL 
  AND "isCalculated" = true 
  AND status = 'CLOSED'
GROUP BY "userId", EXTRACT(HOUR FROM "openTime");

CREATE UNIQUE INDEX ON hourly_trade_distribution("userId", hour_of_day);

-- Monthly performance summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_performance_summary AS
SELECT 
    "userId",
    EXTRACT(YEAR FROM date) as year,
    EXTRACT(MONTH FROM date) as month,
    COUNT(*) as trade_count,
    SUM(pnl) as monthly_pnl,
    SUM(quantity) as monthly_volume,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
    MAX(pnl) as best_trade,
    MIN(pnl) as worst_trade,
    COUNT(DISTINCT symbol) as unique_symbols,
    SUM(COALESCE(commission, 0) + COALESCE(fees, 0)) as total_costs
FROM trades 
WHERE "isCalculated" = true AND status = 'CLOSED'
GROUP BY "userId", EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date);

CREATE UNIQUE INDEX ON monthly_performance_summary("userId", year, month);

-- Symbol performance view
CREATE MATERIALIZED VIEW IF NOT EXISTS symbol_performance_summary AS
SELECT 
    "userId",
    symbol,
    COUNT(*) as trade_count,
    SUM(pnl) as total_pnl,
    SUM(quantity) as total_volume,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
    MAX(pnl) as best_trade,
    MIN(pnl) as worst_trade,
    ROUND(STDDEV(pnl), 2) as pnl_volatility,
    MIN(date) as first_trade_date,
    MAX(date) as last_trade_date
FROM trades 
WHERE "isCalculated" = true AND status = 'CLOSED'
GROUP BY "userId", symbol;

CREATE UNIQUE INDEX ON symbol_performance_summary("userId", symbol);

-- Day of week performance view
CREATE MATERIALIZED VIEW IF NOT EXISTS day_of_week_performance AS
SELECT 
    "userId",
    EXTRACT(DOW FROM date) as day_of_week,
    CASE EXTRACT(DOW FROM date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    COUNT(*) as trade_count,
    SUM(pnl) as total_pnl,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate
FROM trades 
WHERE "isCalculated" = true AND status = 'CLOSED'
GROUP BY "userId", EXTRACT(DOW FROM date);

CREATE UNIQUE INDEX ON day_of_week_performance("userId", day_of_week);

-- Holding period analysis view
CREATE MATERIALIZED VIEW IF NOT EXISTS holding_period_analysis AS
SELECT 
    "userId",
    "holdingPeriod",
    COUNT(*) as trade_count,
    SUM(pnl) as total_pnl,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
    ROUND(AVG("timeInTrade"), 0) as avg_duration_seconds,
    MAX("timeInTrade") as max_duration_seconds,
    MIN("timeInTrade") as min_duration_seconds
FROM trades 
WHERE "isCalculated" = true 
  AND status = 'CLOSED' 
  AND "timeInTrade" IS NOT NULL
GROUP BY "userId", "holdingPeriod";

CREATE UNIQUE INDEX ON holding_period_analysis("userId", "holdingPeriod");

-- Market session performance view
CREATE MATERIALIZED VIEW IF NOT EXISTS market_session_performance AS
SELECT 
    "userId",
    "marketSession",
    COUNT(*) as trade_count,
    SUM(pnl) as total_pnl,
    ROUND(AVG(pnl), 2) as avg_pnl_per_trade,
    ROUND((SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as win_rate,
    SUM(quantity) as total_volume
FROM trades 
WHERE "isCalculated" = true AND status = 'CLOSED'
GROUP BY "userId", "marketSession";

CREATE UNIQUE INDEX ON market_session_performance("userId", "marketSession");

-- Cumulative P&L view for equity curve calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_pnl AS
WITH daily_pnl AS (
    SELECT 
        "userId",
        date::date as trade_date,
        SUM(pnl) as daily_pnl
    FROM trades 
    WHERE "isCalculated" = true AND status = 'CLOSED'
    GROUP BY "userId", date::date
)
SELECT 
    "userId",
    trade_date,
    daily_pnl,
    SUM(daily_pnl) OVER (
        PARTITION BY "userId" 
        ORDER BY trade_date 
        ROWS UNBOUNDED PRECEDING
    ) as cumulative_pnl
FROM daily_pnl;

CREATE UNIQUE INDEX ON cumulative_pnl("userId", trade_date);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_trade_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_trade_distribution;
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY symbol_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY day_of_week_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY holding_period_analysis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY market_session_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY cumulative_pnl;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to refresh views when trades are modified
CREATE OR REPLACE FUNCTION trigger_refresh_analytics_views()
RETURNS trigger AS $$
BEGIN
    -- Use pg_notify to signal that views need refreshing
    -- This allows for background refresh processes
    PERFORM pg_notify('analytics_views_refresh', NEW."userId");
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic view refresh
CREATE TRIGGER trades_analytics_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON trades
    FOR EACH ROW
    WHEN (NEW."isCalculated" = true OR OLD."isCalculated" = true)
    EXECUTE FUNCTION trigger_refresh_analytics_views();