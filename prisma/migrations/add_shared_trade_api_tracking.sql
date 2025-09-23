-- Migration: Add API call tracking and security for shared trades
-- Created: 2025-01-XX
-- Purpose: Implement secure API call tracking and automatic cleanup for shared trade records

-- Add new columns for API tracking (using camelCase to match Prisma)
ALTER TABLE shared_trades
ADD COLUMN IF NOT EXISTS "apiCallCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxApiCalls" INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS "lastApiCallAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "apiCallsPerMinute" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "minuteWindowStart" TIMESTAMP WITH TIME ZONE;

-- Add constraints for data integrity
ALTER TABLE shared_trades
ADD CONSTRAINT check_api_call_count_positive
CHECK ("apiCallCount" >= 0);

ALTER TABLE shared_trades
ADD CONSTRAINT check_max_api_calls_positive
CHECK ("maxApiCalls" > 0);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_shared_trades_api_usage
ON shared_trades ("apiCallCount", "maxApiCalls");

-- Create audit table for tracking deletions
CREATE TABLE IF NOT EXISTS shared_trade_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "shareKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletionReason" TEXT NOT NULL,
    "finalApiCount" INTEGER,
    "accessCount" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for audit table
CREATE INDEX IF NOT EXISTS idx_shared_trade_deletions_user_id
ON shared_trade_deletions ("userId");

CREATE INDEX IF NOT EXISTS idx_shared_trade_deletions_deleted_at
ON shared_trade_deletions ("deletedAt");

CREATE INDEX IF NOT EXISTS idx_shared_trade_deletions_share_key
ON shared_trade_deletions ("shareKey");

-- Create secure function for atomic API call incrementing
CREATE OR REPLACE FUNCTION increment_shared_api_calls(
    p_share_key TEXT,
    p_max_per_minute INTEGER DEFAULT 10
) RETURNS TABLE(
    success BOOLEAN,
    current_count INTEGER,
    remaining_calls INTEGER,
    should_delete BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record shared_trades;
    v_current_minute TIMESTAMP WITH TIME ZONE;
BEGIN
    v_current_minute := date_trunc('minute', CURRENT_TIMESTAMP);

    -- Atomic operation with row-level lock (NOWAIT to fail fast)
    SELECT * INTO v_record
    FROM shared_trades
    WHERE "shareKey" = p_share_key
    FOR UPDATE NOWAIT;

    -- Check if record exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, FALSE, 'Shared record not found'::TEXT;
        RETURN;
    END IF;

    -- Check if already at limit
    IF v_record."apiCallCount" >= v_record."maxApiCalls" THEN
        RETURN QUERY SELECT FALSE, v_record."apiCallCount", 0, TRUE, 'API call limit exceeded'::TEXT;
        RETURN;
    END IF;

    -- Rate limiting per minute
    IF v_record."minuteWindowStart" IS NULL OR v_record."minuteWindowStart" < v_current_minute THEN
        -- New minute window
        UPDATE shared_trades
        SET "minuteWindowStart" = v_current_minute,
            "apiCallsPerMinute" = 1,
            "apiCallCount" = "apiCallCount" + 1,
            "lastApiCallAt" = CURRENT_TIMESTAMP
        WHERE "shareKey" = p_share_key;
    ELSE
        -- Same minute window
        IF v_record."apiCallsPerMinute" >= p_max_per_minute THEN
            RETURN QUERY SELECT FALSE, v_record."apiCallCount",
                v_record."maxApiCalls" - v_record."apiCallCount", FALSE,
                'Rate limit exceeded (max 10 calls per minute)'::TEXT;
            RETURN;
        END IF;

        UPDATE shared_trades
        SET "apiCallsPerMinute" = "apiCallsPerMinute" + 1,
            "apiCallCount" = "apiCallCount" + 1,
            "lastApiCallAt" = CURRENT_TIMESTAMP
        WHERE "shareKey" = p_share_key;
    END IF;

    -- Return success with updated counts
    SELECT * INTO v_record FROM shared_trades WHERE "shareKey" = p_share_key;
    RETURN QUERY SELECT TRUE, v_record."apiCallCount",
        v_record."maxApiCalls" - v_record."apiCallCount",
        v_record."apiCallCount" >= v_record."maxApiCalls",
        NULL::TEXT;

EXCEPTION
    WHEN lock_not_available THEN
        RETURN QUERY SELECT FALSE, 0, 0, FALSE, 'Request in progress, please try again'::TEXT;
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 0, 0, FALSE, SQLERRM::TEXT;
END;
$$;

-- Create function for automatic cleanup when limit is reached
CREATE OR REPLACE FUNCTION delete_exhausted_shares()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."apiCallCount" >= NEW."maxApiCalls" THEN
        -- Log deletion for audit
        INSERT INTO shared_trade_deletions (
            "shareKey", "userId", "deletedAt", "deletionReason",
            "finalApiCount", "accessCount"
        ) VALUES (
            NEW."shareKey", NEW."userId", CURRENT_TIMESTAMP,
            'API call limit exhausted', NEW."apiCallCount", NEW."accessCount"
        );

        -- Delete the record
        DELETE FROM shared_trades WHERE id = NEW.id;

        -- Prevent the update
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic cleanup
DROP TRIGGER IF EXISTS auto_delete_exhausted_shares ON shared_trades;
CREATE TRIGGER auto_delete_exhausted_shares
    AFTER UPDATE OF "apiCallCount" ON shared_trades
    FOR EACH ROW
    EXECUTE FUNCTION delete_exhausted_shares();

-- Create monitoring view for usage statistics
CREATE OR REPLACE VIEW shared_trade_usage_stats AS
SELECT
    "shareKey",
    "apiCallCount",
    "maxApiCalls",
    ROUND(("apiCallCount"::NUMERIC / "maxApiCalls") * 100, 2) as usage_percentage,
    "maxApiCalls" - "apiCallCount" as remaining_calls,
    "lastApiCallAt",
    CASE
        WHEN "apiCallCount" >= "maxApiCalls" * 0.9 THEN 'CRITICAL'
        WHEN "apiCallCount" >= "maxApiCalls" * 0.7 THEN 'HIGH'
        WHEN "apiCallCount" >= "maxApiCalls" * 0.5 THEN 'MEDIUM'
        ELSE 'LOW'
    END as usage_level,
    "createdAt",
    "expiresAt",
    "accessCount"
FROM shared_trades
ORDER BY usage_percentage DESC;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION increment_shared_api_calls TO your_app_user;
-- GRANT EXECUTE ON FUNCTION delete_exhausted_shares TO your_app_user;

-- Create function to get shared trade with usage stats
CREATE OR REPLACE FUNCTION get_shared_trade_with_usage(p_share_key TEXT)
RETURNS TABLE(
    id TEXT,
    share_key TEXT,
    user_id TEXT,
    trade_snapshot JSONB,
    order_snapshot JSONB,
    metadata JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER,
    api_call_count INTEGER,
    max_api_calls INTEGER,
    remaining_calls INTEGER,
    usage_percentage NUMERIC,
    last_api_call_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.id,
        st."shareKey",
        st."userId",
        st."tradeSnapshot",
        st."orderSnapshot",
        st.metadata,
        st."expiresAt",
        st."accessCount",
        st."apiCallCount",
        st."maxApiCalls",
        (st."maxApiCalls" - st."apiCallCount") as remaining_calls,
        ROUND((st."apiCallCount"::NUMERIC / st."maxApiCalls") * 100, 2) as usage_percentage,
        st."lastApiCallAt",
        st."createdAt"
    FROM shared_trades st
    WHERE st."shareKey" = p_share_key;
END;
$$;

-- Update existing records to have default values
UPDATE shared_trades
SET
    "apiCallCount" = 0,
    "maxApiCalls" = 200,
    "apiCallsPerMinute" = 0
WHERE
    "apiCallCount" IS NULL
    OR "maxApiCalls" IS NULL
    OR "apiCallsPerMinute" IS NULL;

-- Final verification
DO $$
BEGIN
    -- Verify the schema changes were applied
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'shared_trades' AND column_name = 'apiCallCount'
    ) THEN
        RAISE EXCEPTION 'Migration failed: apiCallCount column not created';
    END IF;

    -- Verify the function was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'increment_shared_api_calls'
    ) THEN
        RAISE EXCEPTION 'Migration failed: increment_shared_api_calls function not created';
    END IF;

    -- Verify the trigger was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'auto_delete_exhausted_shares'
    ) THEN
        RAISE EXCEPTION 'Migration failed: auto_delete_exhausted_shares trigger not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully - API tracking for shared trades is now active';
END;
$$;