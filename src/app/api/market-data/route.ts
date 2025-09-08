import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { marketDataService } from '@/lib/marketData/marketDataService';
import { TradeContext } from '@/lib/marketData/types';

// Legacy mock functions removed - now using MarketDataService

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const date = searchParams.get('date');
    const interval = searchParams.get('interval') || '5m';
    const demo = searchParams.get('demo') === 'true';
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
    
    // Check authentication for non-demo and non-shared requests
    if (!demo && !shared) {
      const user = await getCurrentUser();
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
    
    // Generate demo data if requested
    if (demo) {
      console.log(`Generating demo data for ${symbol} on ${date} (${interval})`);
      const response = generateDemoData(symbol, date, interval);
      return NextResponse.json(response);
    }

    // Use the market data service to fetch data
    console.log(`Fetching market data for ${symbol} on ${date} (${interval})`);
    const response = await marketDataService.fetchMarketData(tradeContext, interval);
    
    // Log the result for debugging
    if (response.success) {
      console.log(`Successfully fetched ${response.ohlc.length} candles from ${response.source}`);
    } else {
      console.error(`Market data fetch failed: ${response.error}`);
      
      // If all providers failed, generate demo data as fallback
      console.log(`Generating demo data as fallback for ${symbol} on ${date}`);
      const demoResponse = generateDemoData(symbol, date, interval);
      return NextResponse.json({
        ...demoResponse,
        error: `Real data unavailable: ${response.error}. Showing demo data.`
      });
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
        success: false,
        source: 'error',
        symbol: '',
        date: '',
        interval: '',
        ohlc: []
      },
      { status: 500 }
    );
  }
}

/**
 * Generate realistic demo data for testing
 */
function generateDemoData(symbol: string, date: string, interval: string) {
  const intervalMs = interval === '1m' ? 60000 : 
                   interval === '5m' ? 300000 :
                   interval === '15m' ? 900000 :
                   interval === '1h' ? 3600000 : 300000; // default 5m

  const tradeDate = new Date(date);
  const ohlc = [];
  
  // Generate data for extended trading hours (4 AM to 8 PM)
  const startTime = new Date(tradeDate);
  startTime.setHours(4, 0, 0, 0); // 4:00 AM
  
  const endTime = new Date(tradeDate);
  endTime.setHours(20, 0, 0, 0); // 8:00 PM
  
  let currentTime = startTime.getTime();
  const basePrice = 2.05; // Starting price for demo
  let lastPrice = basePrice;
  
  while (currentTime <= endTime.getTime()) {
    const hour = new Date(currentTime).getHours();
    
    // Determine if market is active and set volume accordingly
    const isPreMarket = hour >= 4 && hour < 9.5;  // 4 AM - 9:30 AM
    const isRegularHours = hour >= 9.5 && hour < 16; // 9:30 AM - 4 PM
    const isAfterHours = hour >= 16 && hour < 20; // 4 PM - 8 PM
    
    // Skip some candles during inactive periods to simulate real trading patterns
    if (isPreMarket && Math.random() > 0.3) {
      currentTime += intervalMs;
      continue;
    }
    if (isAfterHours && Math.random() > 0.4) {
      currentTime += intervalMs;
      continue;
    }
    
    // Generate realistic price movement
    const volatility = isRegularHours ? 0.02 : 0.01; // More volatile during regular hours
    const priceChange = (Math.random() - 0.5) * volatility * lastPrice;
    const open = lastPrice;
    const close = Math.max(0.01, lastPrice + priceChange);
    
    // Generate high and low around open/close
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    // Generate volume based on time of day
    let baseVolume = 1000;
    if (isRegularHours) baseVolume = 3000;
    else if (isPreMarket || isAfterHours) baseVolume = 500;
    
    const volume = Math.floor(baseVolume * (0.5 + Math.random()));
    
    ohlc.push({
      timestamp: currentTime,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
      volume
    });
    
    lastPrice = close;
    currentTime += intervalMs;
  }
  
  return {
    symbol,
    date,
    interval,
    ohlc,
    success: true,
    source: 'demo',
    cached: false
  };
}

// TODO: Future implementation with real market data providers
/*
async function fetchRealMarketData(symbol: string, date: string, interval: string): Promise<OHLCData[]> {
  // Integration options:
  // 1. Yahoo Finance API (free but rate limited)
  // 2. Alpha Vantage (free tier available)
  // 3. Polygon.io (paid but comprehensive)
  // 4. IEX Cloud (freemium model)
  // 5. Twelve Data (freemium model)
  
  // Example with Alpha Vantage:
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`
  );
  
  const data = await response.json();
  // Transform API response to OHLCData format
  return transformAlphaVantageData(data);
}
*/