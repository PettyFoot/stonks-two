// Script to update the record_api_call function with auto-cleanup functionality
// This adds automatic deletion of records older than 1 hour when new records are inserted

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Updating record_api_call function with auto-cleanup...');
    
    // Execute the function creation directly
    const functionSQL = `
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
    v_deleted_count INTEGER;
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
    
    -- Auto-cleanup: Delete records older than 1 hour for this user
    -- This keeps the table size manageable and happens automatically
    DELETE FROM api_usage 
    WHERE user_id = p_user_id 
      AND timestamp < (NOW() - INTERVAL '1 hour');
      
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log cleanup if records were deleted (optional, can be removed for production)
    IF v_deleted_count > 0 THEN
        RAISE NOTICE 'Auto-cleanup: Deleted % old API usage records for user %', v_deleted_count, p_user_id;
    END IF;
    
    RETURN v_call_id;
END;
$$ LANGUAGE plpgsql;`;
    
    // Execute the function creation
    await prisma.$executeRawUnsafe(functionSQL);
    
    // Add the comment
    await prisma.$executeRawUnsafe(`
      COMMENT ON FUNCTION record_api_call IS 'Records an API call and automatically cleans up records older than 1 hour for the same user to keep table size manageable'
    `);
    
    console.log('✅ Successfully updated record_api_call function');
    console.log('📝 Function now automatically deletes records older than 1 hour when inserting new ones');
    
    console.log('');
    console.log('🎯 Migration completed successfully!');
    console.log('📋 What changed:');
    console.log('   • record_api_call() function now includes auto-cleanup');
    console.log('   • Records older than 1 hour are automatically deleted when new records are inserted');
    console.log('   • Cleanup is user-specific to minimize database impact');
    console.log('   • No scheduled tasks or manual triggers needed');
    console.log('');
    console.log('💡 The cleanup will happen automatically whenever API usage is tracked!');
    
  } catch (error) {
    console.error('❌ Error updating function:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { main };