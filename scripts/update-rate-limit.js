const { Client } = require('pg');

async function updateRateLimit() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('🔧 Updating rate limit from 25 to 10 calls per 30 minutes...\n');
    
    // Update the can_make_api_call function with new limit of 10
    await client.query(`
      CREATE OR REPLACE FUNCTION can_make_api_call(
          p_user_id VARCHAR(255)
      ) RETURNS TABLE (
          allowed BOOLEAN,
          calls_made INTEGER,
          calls_remaining INTEGER,
          reset_time TIMESTAMPTZ,
          subscription_tier TEXT
      ) AS $$
      BEGIN
          RETURN QUERY
          WITH user_data AS (
              SELECT COALESCE("subscriptionTier", 'FREE')::text as tier
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
                  ELSE usage.call_count < 10
              END as allowed,
              usage.call_count as calls_made,
              CASE 
                  WHEN ud.tier = 'PREMIUM' THEN NULL
                  ELSE GREATEST(0, 10 - usage.call_count)
              END as calls_remaining,
              NOW() + INTERVAL '30 minutes' as reset_time,
              ud.tier as subscription_tier
          FROM user_data ud
          CROSS JOIN usage_data usage;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ can_make_api_call function updated to 10 calls per 30 minutes');
    
    // Test the updated function
    const testUserId = 'cmex8m01g0000uax0egqyk13n'; // Your user ID
    
    const result = await client.query(
      'SELECT * FROM can_make_api_call($1)',
      [testUserId]
    );
    
    console.log('✅ Function test successful:', result.rows[0]);
    
    console.log('\n🎉 Rate limit successfully updated!');
    console.log('FREE users: 10 API calls per 30 minutes');
    console.log('PREMIUM users: Unlimited API calls');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

updateRateLimit();