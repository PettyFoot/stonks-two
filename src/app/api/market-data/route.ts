import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketDataResponse {
  symbol: string;
  date: string;
  interval: string;
  ohlc: OHLCData[];
  success: boolean;
  error?: string;
}

// Mock data generator for development
function generateMockOHLCData(
  symbol: string, 
  date: string, 
  interval: string,
  basePrice?: number
): OHLCData[] {
  const data: OHLCData[] = [];
  const startTime = new Date(`${date} 09:30:00`).getTime();
  
  // Interval in milliseconds
  const intervalMs = interval === '1m' ? 60000 : 
                    interval === '5m' ? 300000 :
                    interval === '15m' ? 900000 :
                    interval === '1h' ? 3600000 : 86400000;
  
  // Base price - use provided or generate based on symbol
  let currentPrice = basePrice || getBasePrice(symbol);
  
  // Generate data points for market hours (6.5 hours = 390 minutes)
  const dataPoints = interval === '1m' ? 390 : 
                     interval === '5m' ? 78 :
                     interval === '15m' ? 26 :
                     interval === '1h' ? 7 : 1;
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = startTime + (i * intervalMs);
    
    // Skip lunch break (12:00-13:00) for realism
    const currentHour = new Date(timestamp).getHours();
    if (currentHour === 12) continue;
    
    // Volatility based on symbol (more volatile for smaller caps)
    const volatility = getSymbolVolatility(symbol);
    
    const open = currentPrice;
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    const high = Math.max(open, open + Math.abs(change) * (1 + Math.random()));
    const low = Math.min(open, open - Math.abs(change) * (1 + Math.random()));
    const close = open + change;
    
    // Add some trend bias based on time of day
    const trendBias = getTrendBias(currentHour);
    const finalClose = close + (trendBias * currentPrice * 0.001);
    
    data.push({
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(finalClose.toFixed(2)),
      volume: generateVolume(interval)
    });
    
    currentPrice = finalClose;
  }
  
  return data;
}

function getBasePrice(symbol: string): number {
  // Generate consistent base prices based on symbol hash
  const hash = symbol.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Price ranges for different symbol types
  if (symbol.includes('SPY') || symbol.includes('QQQ')) return 400 + (Math.abs(hash) % 100);
  if (symbol.length <= 3) return 50 + (Math.abs(hash) % 200); // Major stocks
  return 10 + (Math.abs(hash) % 40); // Smaller stocks
}

function getSymbolVolatility(symbol: string): number {
  if (symbol.includes('SPY') || symbol.includes('QQQ')) return 0.015; // ETFs - lower volatility
  if (symbol.length <= 3) return 0.025; // Major stocks
  return 0.035; // Smaller stocks - higher volatility
}

function getTrendBias(hour: number): number {
  // Market opening bias (higher volatility)
  if (hour === 9) return Math.random() > 0.5 ? 2 : -2;
  // Power hour bias (late afternoon)
  if (hour === 15) return Math.random() > 0.5 ? 1 : -1;
  // Lunch time - less movement
  if (hour >= 11 && hour <= 14) return (Math.random() - 0.5) * 0.5;
  // Normal trading hours
  return (Math.random() - 0.5) * 1;
}

function generateVolume(interval: string): number {
  const baseVolume = interval === '1m' ? 10000 : 
                     interval === '5m' ? 50000 :
                     interval === '15m' ? 150000 :
                     interval === '1h' ? 600000 : 5000000;
  
  return Math.floor(baseVolume + (Math.random() * baseVolume * 0.5));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const date = searchParams.get('date');
    const interval = searchParams.get('interval') || '5m';
    const demo = searchParams.get('demo') === 'true';
    
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
    
    // For now, always return mock data since we don't have real market data integration
    // In the future, this would check for authentication and call a real market data provider
    
    let basePrice: number | undefined;
    
    // If not in demo mode, check authentication
    if (!demo) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // In a real implementation, you might fetch the user's recent trades for this symbol
      // to get a realistic base price around their trading activity
      // const recentTrades = await getRecentTradesForSymbol(user.id, symbol, date);
      // basePrice = recentTrades[0]?.averagePrice;
    }
    
    const ohlcData = generateMockOHLCData(symbol, date, interval, basePrice);
    
    const response: MarketDataResponse = {
      symbol,
      date,
      interval,
      ohlc: ohlcData,
      success: true
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
        success: false
      },
      { status: 500 }
    );
  }
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