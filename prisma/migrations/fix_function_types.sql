-- Fix the get_shared_trade_with_usage function to match Prisma types
DROP FUNCTION IF EXISTS get_shared_trade_with_usage(TEXT);

CREATE OR REPLACE FUNCTION get_shared_trade_with_usage(p_share_key TEXT)
RETURNS TABLE(
    id TEXT,
    share_key TEXT,
    user_id TEXT,
    trade_snapshot JSONB,
    order_snapshot JSONB,
    metadata JSONB,
    expires_at TIMESTAMP(3),
    access_count INTEGER,
    api_call_count INTEGER,
    max_api_calls INTEGER,
    remaining_calls INTEGER,
    usage_percentage NUMERIC,
    last_api_call_at TIMESTAMP(3),
    created_at TIMESTAMP(3)
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
        st."expiresAt"::TIMESTAMP(3),
        st."accessCount",
        st."apiCallCount",
        st."maxApiCalls",
        (st."maxApiCalls" - st."apiCallCount") as remaining_calls,
        ROUND((st."apiCallCount"::NUMERIC / st."maxApiCalls") * 100, 2) as usage_percentage,
        st."lastApiCallAt"::TIMESTAMP(3),
        st."createdAt"::TIMESTAMP(3)
    FROM shared_trades st
    WHERE st."shareKey" = p_share_key;
END;
$$;