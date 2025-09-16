import { MarketDataProvider, OHLCData, TimeWindow, TradeContext } from '../types';

/**
 * Demo data provider that generates realistic market data for testing
 * Used when all other providers fail or for demo mode
 */
export class DemoProvider implements MarketDataProvider {
  name = 'Demo Data';
  
  isAvailable(): boolean {
    return true; // Always available
  }
  
  /**
   * Generate realistic demo OHLC data
   */
  async fetchOHLC(
    symbol: string, 
    timeWindow: TimeWindow, 
    _tradeContext?: TradeContext
  ): Promise<OHLCData[]> {
    
    const intervalMs = this.getIntervalMs(timeWindow.interval);
    const ohlc: OHLCData[] = [];
    
    // Generate data for the time window
    let currentTime = timeWindow.start.getTime();
    const endTime = timeWindow.end.getTime();
    
    // Base price based on symbol (realistic starting prices)
    const basePrices: Record<string, number> = {
      'AAPL': 175.50,
      'TSLA': 350.75,
      'MSFT': 380.25,
      'GOOGL': 2800.00,
      'NVDA': 450.30,
      'SPY': 480.75,
      'QQQ': 380.50,
      'default': 150.00
    };
    
    let lastPrice = basePrices[symbol.toUpperCase()] || basePrices.default;
    
    while (currentTime <= endTime) {
      const currentDate = new Date(currentTime);
      const hour = currentDate.getHours();
      
      // Determine if market is active and set volume/volatility accordingly
      const isPreMarket = hour >= 4 && hour < 9.5;
      const isRegularHours = hour >= 9.5 && hour < 16;
      const isAfterHours = hour >= 16 && hour < 20;
      
      // Skip some candles during inactive periods to simulate real trading patterns
      if (isPreMarket && Math.random() > 0.3) {
        currentTime += intervalMs;
        continue;
      }
      if (isAfterHours && Math.random() > 0.4) {
        currentTime += intervalMs;
        continue;
      }
      if (!isPreMarket && !isRegularHours && !isAfterHours) {
        currentTime += intervalMs;
        continue; // Skip overnight hours
      }
      
      // Generate realistic price movement
      const volatility = isRegularHours ? 0.008 : 0.003; // More volatile during regular hours
      const trend = this.getTrendFactor(currentDate, symbol);
      const noise = (Math.random() - 0.5) * 2;
      
      // Create price change with trend and noise
      const priceChange = lastPrice * volatility * (trend + noise);
      const open = lastPrice;
      const close = Math.max(0.01, lastPrice + priceChange);
      
      // Generate high and low around open/close with realistic spreads
      const highLowSpread = Math.abs(close - open) + (lastPrice * volatility * Math.random());
      const high = Math.max(open, close) + (highLowSpread * Math.random());
      const low = Math.min(open, close) - (highLowSpread * Math.random());
      
      // Generate volume based on time of day and interval
      let baseVolume = this.getBaseVolume(timeWindow.interval);
      if (isRegularHours) baseVolume *= 3;
      else if (isPreMarket || isAfterHours) baseVolume *= 0.3;
      
      const volume = Math.floor(baseVolume * (0.5 + Math.random() * 1.5));
      
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
    
    // Log demo data generation
    if (ohlc.length > 0) {
      const firstCandle = new Date(ohlc[0].timestamp);
      const lastCandle = new Date(ohlc[ohlc.length - 1].timestamp);
      const timeSpan = (lastCandle.getTime() - firstCandle.getTime()) / (1000 * 60 * 60);
      




    }
    
    return ohlc;
  }
  
  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(interval: string): number {
    const intervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '1d': 86400000
    };
    
    return intervalMap[interval] || 300000; // Default to 5m
  }
  
  /**
   * Get base volume for interval
   */
  private getBaseVolume(interval: string): number {
    const volumeMap: Record<string, number> = {
      '1m': 1000,
      '5m': 5000,
      '15m': 15000,
      '30m': 30000,
      '1h': 100000,
      '1d': 500000
    };
    
    return volumeMap[interval] || 5000; // Default to 5m volume
  }
  
  /**
   * Get trend factor based on time of day and symbol
   */
  private getTrendFactor(date: Date, symbol: string): number {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeOfDay = hour + minute / 60;
    
    // Create some intraday patterns
    let trend = 0;
    
    // Morning gap (9:30 AM)
    if (timeOfDay > 9.3 && timeOfDay < 10) {
      trend += Math.sin((timeOfDay - 9.3) * Math.PI) * 0.5;
    }
    
    // Lunch lull (12-2 PM)
    if (timeOfDay > 12 && timeOfDay < 14) {
      trend -= 0.2;
    }
    
    // Closing hour activity (3-4 PM)
    if (timeOfDay > 15 && timeOfDay < 16) {
      trend += 0.3;
    }
    
    // Add symbol-specific bias
    const symbolBias = this.getSymbolBias(symbol);
    trend += symbolBias;
    
    return Math.max(-1, Math.min(1, trend)); // Clamp between -1 and 1
  }
  
  /**
   * Get symbol-specific bias (some stocks are more bullish/bearish)
   */
  private getSymbolBias(symbol: string): number {
    const biases: Record<string, number> = {
      'AAPL': 0.1,   // Slight upward bias
      'TSLA': 0.2,   // More volatile, upward bias
      'MSFT': 0.05,  // Stable, slight up
      'GOOGL': 0.08, // Slight upward bias
      'NVDA': 0.15,  // Tech growth, upward bias
      'SPY': 0.02,   // Market average, slight up
      'QQQ': 0.05,   // Tech-heavy, slight up
    };
    
    return biases[symbol.toUpperCase()] || 0;
  }
  
  /**
   * Get rate limit info (demo has no limits)
   */
  getRateLimitInfo() {
    return {
      requestsPerMinute: Infinity,
      requestsPerDay: Infinity,
      burstLimit: Infinity,
      cooldownSeconds: 0
    };
  }
  
  /**
   * Test connection (always succeeds for demo)
   */
  async testConnection(): Promise<boolean> {
    return true;
  }
}