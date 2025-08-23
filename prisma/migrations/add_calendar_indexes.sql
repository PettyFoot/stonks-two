-- Add indexes for calendar performance optimization
-- These indexes support the calendar view queries that aggregate trades by date

-- Add composite index for user + date filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS "trades_userId_date_idx" ON trades("userId", date);

-- Add index for date-based queries
CREATE INDEX IF NOT EXISTS "trades_date_idx" ON trades(date);

-- Add partial index for closed trades (most common query filter)
-- This index is optimized for queries that filter by userId, status='CLOSED', and date range
CREATE INDEX IF NOT EXISTS "trades_userId_status_date_idx" 
ON trades("userId", date) 
WHERE status = 'CLOSED';

-- Add index for year extraction queries
CREATE INDEX IF NOT EXISTS "trades_date_year_idx" ON trades((EXTRACT(YEAR FROM date)));

-- Add index for month extraction queries
CREATE INDEX IF NOT EXISTS "trades_date_month_idx" ON trades((EXTRACT(MONTH FROM date)));

-- Add index for day extraction queries
CREATE INDEX IF NOT EXISTS "trades_date_day_idx" ON trades((EXTRACT(DAY FROM date)));