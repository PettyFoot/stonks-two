import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { marketDataService } from '@/lib/marketData/marketDataService';
import { TradeContext } from '@/lib/marketData/types';
import { enforceMarketDataRateLimit, RateLimitExceededError } from '@/lib/marketData/rateLimiter';
import { recordMarketDataApiCall } from '@/lib/marketData/usageTracking';
import { isDemoUser } from '@/lib/demo/demoSession';

// Generate dummy market data for demo mode
function generateDummyMarketData(symbol: string, date: string, interval: string) {
  const requestedDate = new Date(date + 'T09:30:00'); // Market open
  
  // Generate different but consistent patterns for different symbols
  const symbolSeed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = ((symbolSeed % 100) + 50) + (symbolSeed % 20); // Price range $50-170
  
  const candles = [];
  const intervalMinutes = interval === '1m' ? 1 : interval === '5m' ? 5 : interval === '15m' ? 15 : interval === '1h' ? 60 : 60;
  const totalCandles = interval === '1d' ? 1 : Math.min(78, Math.floor(390 / intervalMinutes)); // Max 78 candles for 6.5 hour trading day
  
  let currentPrice = basePrice;
  const startTime = new Date(requestedDate);
  
  // Create a trending pattern that's good for showing buy/sell executions
  const trendDirection = (symbolSeed % 2 === 0) ? 1 : -1; // Some symbols trend up, others down
  const trendStrength = 0.002; // 0.2% per candle trend
  
  for (let i = 0; i < totalCandles; i++) {
    const timestamp = new Date(startTime.getTime() + (i * intervalMinutes * 60000));
    
    // Create more realistic price movements with trends
    const volatility = 0.015; // 1.5% volatility
    const cyclicalPattern = Math.sin(i / 8) * 0.003; // Some cyclical movement
    const trend = trendDirection * trendStrength * i; // Overall trend
    const randomChange = (Math.random() - 0.5) * volatility;
    
    const priceChange = (trend + cyclicalPattern + randomChange) * currentPrice;
    const open = currentPrice;
    const close = currentPrice + priceChange;
    
    // High and low with some realistic spread
    const spreadRange = Math.abs(priceChange) * 1.5 + (currentPrice * 0.008); // Wider spread
    const high = Math.max(open, close) + (Math.random() * spreadRange * 0.6);
    const low = Math.min(open, close) - (Math.random() * spreadRange * 0.4);
    
    candles.push({
      timestamp: timestamp.getTime(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 150000) + 20000 // Random volume 20k-170k
    });
    
    currentPrice = close;
  }
  
  
  return {
    symbol,
    date,
    interval,
    ohlc: candles,
    success: true,
    error: null,
    source: 'demo_data' as const,
    cached: false
  };
}

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
    
    // Check if this is a demo user and return dummy data
    if (user && isDemoUser(user.id)) {
      const dummyData = generateDummyMarketData(symbol, date, interval);
      return NextResponse.json(dummyData);
    }
    
    // Build simple trade context with just basic info
    const tradeContext: TradeContext = {
      symbol,
      date,
      time: undefined,
      side: 'long' // Default side, not used in current implementation
    };
    
    const startTime = Date.now();
    let rateLimitInfo = null;
    let responseStatusCode = 200;
    let errorMessage = null;

    try {
      // Check rate limits for authenticated users (skip for shared requests)
      // Now checks ALL providers (not provider-specific)
      if (user) {
        rateLimitInfo = await enforceMarketDataRateLimit(user.id);

      }

      // Use the market data service to fetch data
      const response = await marketDataService.fetchMarketData(tradeContext, interval);
      
      // Log cache vs API usage
      if (response.cached) {
      } else {
      }
      
      // Record the API call for usage tracking (only for authenticated users and non-cached responses)
      if (user && rateLimitInfo && !response.cached) {
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
      } else if (user && response.cached) {
      }
      
      // Log the result for debugging
      if (response.success) {

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
        source: 'polygon',
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