import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { marketDataService } from '@/lib/marketData/marketDataService';
import { TradeContext } from '@/lib/marketData/types';
import { enforceMarketDataRateLimit, RateLimitExceededError } from '@/lib/marketData/rateLimiter';
import { recordMarketDataApiCall } from '@/lib/marketData/usageTracking';

// Legacy mock functions removed - now using MarketDataService

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const date = searchParams.get('date');
    const interval = searchParams.get('interval') || '5m';
    // REMOVED: demo parameter - no demo data in production
    const shared = searchParams.get('shared') === 'true';
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    
    // Validate interval
    const validIntervals = ['1m', '5m', '15m', '1h', '1d'];
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check authentication for non-shared requests (demo parameter removed)
    let user = null;
    if (!shared) {
      user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    // Build simple trade context with just basic info
    const tradeContext: TradeContext = {
      symbol,
      date,
      time: undefined,
      side: 'long' // Default side, not used in current implementation
    };
    
    // REMOVED: Demo data generation - always use real data sources
    
    const startTime = Date.now();
    let rateLimitInfo = null;
    let responseStatusCode = 200;
    let errorMessage = null;

    try {
      // Check rate limits for authenticated users (skip for shared requests)
      // Now checks ALL providers (not provider-specific)
      if (user) {
        console.log(`🔒 Checking rate limits for user ${user.id}`);
        rateLimitInfo = await enforceMarketDataRateLimit(user.id);
        console.log(`✅ Rate limit check passed: ${rateLimitInfo.callsMade} calls made (all providers), ${rateLimitInfo.callsRemaining || 'unlimited'} remaining`);
      }

      // Use the market data service to fetch data
      console.log(`📊 Fetching market data for ${symbol} on ${date} (${interval})`);
      const response = await marketDataService.fetchMarketData(tradeContext, interval);
      
      // Record the API call for usage tracking (only for authenticated users)
      if (user && rateLimitInfo) {
        const responseTime = Date.now() - startTime;
        await recordMarketDataApiCall(
          user.id,
          response.source,
          `/api/market-data`,
          {
            statusCode: 200,
            responseTimeMs: responseTime,
            responseSizeBytes: JSON.stringify(response).length
          }
        );
        console.log(`📝 Recorded API usage: ${response.source} call for user ${user.id}`);
      }
      
      // Log the result for debugging
      if (response.success) {
        console.log(`✅ Successfully fetched ${response.ohlc.length} candles from ${response.source}`);
      } else {
        console.error(`❌ Market data fetch failed: ${response.error}`);
        responseStatusCode = 500;
        errorMessage = response.error;
      }
      
      // Add rate limit headers for authenticated users
      const headers: Record<string, string> = {};
      if (rateLimitInfo && user) {
        headers['X-RateLimit-Tier'] = rateLimitInfo.subscriptionTier;
        headers['X-RateLimit-Calls-Made'] = rateLimitInfo.callsMade.toString();
        
        if (rateLimitInfo.subscriptionTier === 'FREE') {
          headers['X-RateLimit-Limit'] = '10';
          headers['X-RateLimit-Remaining'] = (rateLimitInfo.callsRemaining || 0).toString();
          headers['X-RateLimit-Reset'] = Math.ceil(rateLimitInfo.resetAt.getTime() / 1000).toString();
        }
      }
      
      return NextResponse.json(response, { headers });

    } catch (error) {
      responseStatusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle rate limit exceeded errors specifically
      if (error instanceof RateLimitExceededError) {
        console.warn(`🚫 Rate limit exceeded for user ${user?.id}:`, error.message);
        
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            source: 'polygon',
            symbol,
            date,
            interval,
            ohlc: [],
            rateLimitInfo: error.rateLimitInfo
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Tier': error.rateLimitInfo.subscriptionTier,
              'X-RateLimit-Calls-Made': error.rateLimitInfo.callsMade.toString(),
              'X-RateLimit-Limit': error.rateLimitInfo.subscriptionTier === 'FREE' ? '10' : 'unlimited',
              'X-RateLimit-Remaining': (error.rateLimitInfo.callsRemaining || 0).toString(),
              'X-RateLimit-Reset': Math.ceil(error.rateLimitInfo.resetAt.getTime() / 1000).toString(),
              'Retry-After': Math.ceil((error.rateLimitInfo.resetAt.getTime() - Date.now()) / 1000).toString()
            }
          }
        );
      }

      // Record failed API call for analytics
      if (user) {
        const responseTime = Date.now() - startTime;
        await recordMarketDataApiCall(
          user.id,
          'unknown', // We don't know which provider failed
          `/api/market-data`,
          {
            statusCode: responseStatusCode,
            responseTimeMs: responseTime,
            errorMessage
          }
        );
      }

      console.error('❌ Market data API error:', error);
      
      return NextResponse.json(
        { 
          error: errorMessage,
          success: false,
          source: 'polygon',
          symbol,
          date,
          interval,
          ohlc: []
        },
        { status: responseStatusCode }
      );
    }
    
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
        success: false,
        source: 'alpha_vantage',
        symbol: '',
        date: '',
        interval: '',
        ohlc: []
      },
      { status: 500 }
    );
  }
}

// REMOVED: generateDemoData function - no demo data in production
// REMOVED: TODO comments about real market data - now implemented with Polygon.io fallback