-- Fix API usage tracking functions to use correct column names
-- The issue: functions were looking for 'subscription_tier' but actual column is 'subscriptionTier'

-- Update the record_api_call function
CREATE OR REPLACE FUNCTION record_api_call(
    p_user_id VARCHAR(255),
    p_endpoint VARCHAR(255),
    p_method VARCHAR(10) DEFAULT 'GET',
    p_request_params JSONB DEFAULT NULL,
    p_response_status INTEGER DEFAULT 200,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_response_size_bytes INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_api_provider VARCHAR(50) DEFAULT 'polygon'
) RETURNS UUID AS $$
DECLARE
    v_subscription_tier VARCHAR(50);
    v_call_id UUID;
BEGIN
    -- Get user's current subscription tier (using correct column name)
    SELECT "subscriptionTier"::text INTO v_subscription_tier
    FROM users
    WHERE id = p_user_id;
    
    -- Insert the API call record
    INSERT INTO api_usage (
        user_id,
        api_provider,
        endpoint,
        method,
        request_params,
        response_status_code,
        response_time_ms,
        response_size_bytes,
        error_message,
        subscription_tier
    ) VALUES (
        p_user_id,
        p_api_provider,
        p_endpoint,
        p_method,
        p_request_params,
        p_response_status,
        p_response_time_ms,
        p_response_size_bytes,
        p_error_message,
        v_subscription_tier
    ) RETURNING id INTO v_call_id;
    
    RETURN v_call_id;
END;
$$ LANGUAGE plpgsql;

-- Update the can_make_api_call function
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
        SELECT "subscriptionTier"::text as tier
        FROM users 
        WHERE id = p_user_id
    ),
    usage_data AS (
        SELECT COUNT(*)::INTEGER as call_count
        FROM api_usage
        WHERE user_id = p_user_id
          AND timestamp > (NOW() - INTERVAL '30 minutes')
          AND counted_for_limit = true
    )
    SELECT 
        CASE 
            WHEN ud.tier = 'PREMIUM' THEN true
            WHEN (ud.tier = 'FREE' OR ud.tier IS NULL) AND usage.call_count < 25 THEN true
            ELSE false
        END as allowed,
        usage.call_count as calls_made,
        CASE 
            WHEN ud.tier = 'PREMIUM' THEN NULL
            ELSE GREATEST(0, 25 - usage.call_count)
        END as calls_remaining,
        NOW() + INTERVAL '30 minutes' as reset_time,
        COALESCE(ud.tier, 'FREE') as subscription_tier
    FROM user_data ud
    CROSS JOIN usage_data usage;
END;
$$ LANGUAGE plpgsql;