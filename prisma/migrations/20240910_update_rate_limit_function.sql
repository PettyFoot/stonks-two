-- Update the rate limit function to count ALL providers (not per-provider)
CREATE OR REPLACE FUNCTION can_make_api_call(
    p_user_id VARCHAR(255)
) RETURNS TABLE (
    allowed BOOLEAN,
    calls_made INTEGER,
    calls_remaining INTEGER,
    reset_time TIMESTAMPTZ,
    subscription_tier VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    WITH user_data AS (
        SELECT subscription_tier::text as tier
        FROM users 
        WHERE id = p_user_id
    ),
    usage_data AS (
        SELECT COUNT(*)::INTEGER as call_count
        FROM api_usage
        WHERE user_id = p_user_id
          AND timestamp > (NOW() - INTERVAL '30 minutes')
          AND counted_for_limit = true
          -- REMOVED: provider filter - now counts ALL API calls across all providers
    )
    SELECT 
        CASE 
            WHEN ud.tier = 'PREMIUM' THEN true
            WHEN ud.tier = 'FREE' AND usage.call_count < 25 THEN true
            ELSE false
        END as allowed,
        usage.call_count as calls_made,
        CASE 
            WHEN ud.tier = 'PREMIUM' THEN NULL
            ELSE GREATEST(0, 25 - usage.call_count)
        END as calls_remaining,
        NOW() + INTERVAL '30 minutes' as reset_time,
        ud.tier as subscription_tier
    FROM user_data ud
    CROSS JOIN usage_data usage;
END;
$$ LANGUAGE plpgsql;