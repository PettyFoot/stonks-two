-- Fix cached plan issue by dropping and recreating the function with a different approach
-- This forces PostgreSQL to invalidate its cached query plans

-- First, drop the existing function completely
DROP FUNCTION IF EXISTS get_shared_trade_with_usage(TEXT);

-- Use DISCARD PLANS to clear all cached prepared statements
DISCARD PLANS;

-- Recreate the function without explicit TIMESTAMP casting
-- Let PostgreSQL handle the type conversion
CREATE OR REPLACE FUNCTION get_shared_trade_with_usage(p_share_key TEXT)
RETURNS TABLE(
    id TEXT,
    share_key TEXT,
    user_id TEXT,
    trade_snapshot JSONB,
    order_snapshot JSONB,
    metadata JSONB,
    expires_at TIMESTAMPTZ,
    access_count INTEGER,
    api_call_count INTEGER,
    max_api_calls INTEGER,
    remaining_calls INTEGER,
    usage_percentage NUMERIC,
    last_api_call_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.id::TEXT,
        st."shareKey"::TEXT,
        st."userId"::TEXT,
        st."tradeSnapshot"::JSONB,
        st."orderSnapshot"::JSONB,
        st.metadata::JSONB,
        st."expiresAt",
        st."accessCount"::INTEGER,
        st."apiCallCount"::INTEGER,
        st."maxApiCalls"::INTEGER,
        (st."maxApiCalls" - st."apiCallCount")::INTEGER,
        ROUND((st."apiCallCount"::NUMERIC / NULLIF(st."maxApiCalls", 0)) * 100, 2),
        st."lastApiCallAt",
        st."createdAt"
    FROM shared_trades st
    WHERE st."shareKey" = p_share_key;
END;
$$;

-- Clear any connection-specific cached plans
DEALLOCATE ALL;