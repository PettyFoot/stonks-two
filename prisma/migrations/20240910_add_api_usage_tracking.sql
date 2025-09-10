-- Create API usage tracking table for rate limiting and analytics
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    
    -- API Call Details
    api_provider VARCHAR(50) NOT NULL DEFAULT 'polygon',
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) DEFAULT 'GET',
    
    -- Request/Response Metadata
    request_params JSONB,
    response_status_code INTEGER,
    response_time_ms INTEGER,
    response_size_bytes INTEGER,
    
    -- Rate Limiting & Tracking
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    counted_for_limit BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50),
    
    -- Error Tracking
    error_message TEXT,
    is_error BOOLEAN GENERATED ALWAYS AS (response_status_code >= 400) STORED,
    
    -- Cost & Credits
    api_credits_used INTEGER DEFAULT 1,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign Key
    CONSTRAINT fk_api_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add check constraints
ALTER TABLE api_usage 
ADD CONSTRAINT check_response_status 
CHECK (response_status_code IS NULL OR (response_status_code >= 100 AND response_status_code < 600));

ALTER TABLE api_usage
ADD CONSTRAINT check_response_time
CHECK (response_time_ms IS NULL OR response_time_ms >= 0);

-- Primary index for rate limit checking (most critical query)
CREATE INDEX idx_api_usage_rate_limit 
ON api_usage(user_id, timestamp DESC) 
WHERE counted_for_limit = true;

-- Index for 30-minute window queries with covering index
CREATE INDEX idx_api_usage_user_window 
ON api_usage(user_id, timestamp DESC, api_provider, counted_for_limit)
INCLUDE (endpoint, response_status_code);

-- Partial index for active time windows (last 31 minutes only)
-- Note: Cannot use NOW() in partial index predicate as it's not immutable
-- This index will be created programmatically if needed
-- CREATE INDEX idx_api_usage_recent_window 
-- ON api_usage(user_id, timestamp DESC) 
-- WHERE timestamp > (NOW() - INTERVAL '31 minutes') 
--   AND counted_for_limit = true;

-- Index for analytics queries by endpoint
CREATE INDEX idx_api_usage_endpoint_analytics 
ON api_usage(user_id, endpoint, timestamp DESC);

-- Index for error tracking
CREATE INDEX idx_api_usage_errors 
ON api_usage(user_id, timestamp DESC) 
WHERE is_error = true;

-- Index for provider-specific queries
CREATE INDEX idx_api_usage_provider 
ON api_usage(api_provider, user_id, timestamp DESC);

-- Function to check if user can make API call (ALL providers combined)
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
          -- REMOVED: AND api_provider = p_api_provider (now counts ALL providers)
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

-- Function to record API call
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
    -- Get user's current subscription tier
    SELECT subscription_tier::text INTO v_subscription_tier
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

-- Cleanup function for old records
CREATE OR REPLACE FUNCTION cleanup_old_api_usage() RETURNS void AS $$
BEGIN
    -- Delete old detailed records (keep 90 days)
    DELETE FROM api_usage 
    WHERE timestamp < (NOW() - INTERVAL '90 days');
    
    -- Update statistics
    ANALYZE api_usage;
END;
$$ LANGUAGE plpgsql;