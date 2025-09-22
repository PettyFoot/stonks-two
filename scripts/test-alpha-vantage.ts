#!/usr/bin/env tsx

/**
 * Test script to verify Alpha Vantage API functionality
 * Usage: npx dotenv -e .env.local -- npx tsx scripts/test-alpha-vantage.ts
 */

import { AlphaVantageProvider } from '../src/lib/marketData/providers/alphaVantageProvider';
import { TimeWindow } from '../src/lib/marketData/types';

async function testAlphaVantageAPI() {
  console.log('🧪 Alpha Vantage API Test Starting...\n');
  
  // Initialize provider
  const provider = new AlphaVantageProvider();
  
  // Test 1: Check if provider is available
  console.log('1. Testing Provider Availability:');
  const isAvailable = provider.isAvailable();
  console.log(`   Available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
  
  if (!isAvailable) {
    console.log('   ❌ Provider not available. Check your API key in .env.local');
    return;
  }
  
  // Test 2: Test connection
  console.log('\n2. Testing Connection:');
  const connectionResult = await provider.testConnection();
  console.log(`   Connection: ${connectionResult ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!connectionResult) {
    console.log('   ❌ Connection test failed. API key may be invalid or rate limited.');
    return;
  }
  
  // Test 3: Test with HOOD for September 5th, 2025 (as requested)
  console.log('\n3. Testing Market Data Fetch (HOOD - September 5th, 2025):');
  
  const testDate = new Date('2025-09-05');
  const startOfDay = new Date(testDate);
  startOfDay.setHours(9, 30, 0, 0); // 9:30 AM
  
  const endOfDay = new Date(testDate);
  endOfDay.setHours(16, 0, 0, 0); // 4:00 PM
  
  const timeWindow: TimeWindow = {
    start: startOfDay,
    end: endOfDay,
    interval: '5m'
  };
  
  try {
    console.log(`   Requesting: HOOD from ${timeWindow.start.toISOString()} to ${timeWindow.end.toISOString()}`);
    console.log(`   Interval: ${timeWindow.interval}`);
    
    const result = await provider.fetchOHLC('HOOD', timeWindow);
    const ohlcData = result.data;

    if (ohlcData && ohlcData.length > 0) {
      console.log(`   ✅ SUCCESS: Retrieved ${ohlcData.length} candles`);
      console.log(`   📊 Data Range: ${new Date(ohlcData[0].timestamp).toLocaleString()} to ${new Date(ohlcData[ohlcData.length - 1].timestamp).toLocaleString()}`);
      console.log(`   💲 Sample Data (first candle):`, {
        time: new Date(ohlcData[0].timestamp).toLocaleString(),
        open: ohlcData[0].open,
        high: ohlcData[0].high,
        low: ohlcData[0].low,
        close: ohlcData[0].close,
        volume: ohlcData[0].volume
      });
      if (result.delayed) {
        console.log(`   ⏰ Data is delayed (15-minute delay)`);
      }
    } else {
      console.log('   ⚠️  No data returned (this might be expected for future dates or non-trading days)');
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Additional error analysis
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        console.log('   💡 This is a rate limit error. Alpha Vantage free tier allows 5 requests per minute.');
      } else if (error.message.includes('premium')) {
        console.log('   💡 This feature requires a premium Alpha Vantage subscription.');
      } else if (error.message.includes('Invalid API call')) {
        console.log('   💡 The symbol or parameters are invalid.');
      }
    }
  }
  
  // Test 4: Get rate limit info
  console.log('\n4. Rate Limit Information:');
  const rateLimitInfo = provider.getRateLimitInfo();
  console.log('   Rate Limits:', rateLimitInfo);
  
  console.log('\n🏁 Alpha Vantage API Test Complete!');
}

// Run the test
testAlphaVantageAPI().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});