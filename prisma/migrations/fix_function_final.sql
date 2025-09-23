-- Check the actual column types first and then fix the function
-- Drop the existing function
DROP FUNCTION IF EXISTS get_shared_trade_with_usage(TEXT);

-- Instead of using a function, let's modify the API route to use a direct query
-- But first, let's create a simpler function that just returns the raw data
CREATE OR REPLACE FUNCTION get_shared_trade_with_usage(p_share_key TEXT)
RETURNS SETOF shared_trades
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM shared_trades WHERE "shareKey" = p_share_key;
END;
$$;