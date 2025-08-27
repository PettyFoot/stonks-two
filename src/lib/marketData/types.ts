export interface OHLCData {
  timestamp: number;  // Unix timestamp in milliseconds
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
  source: 'yahoo' | 'mock';  // Track data source
  cached?: boolean;          // Whether data came from cache
}

export interface TimeWindow {
  start: Date;
  end: Date;
  interval: '1m' | '5m' | '15m' | '1h' | '1d';
  focusTime?: Date;  // The trade execution time
}

export interface TradeContext {
  symbol: string;
  date: string;
  time?: string;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  holdingPeriod?: string;
  side: 'long' | 'short';
}

export interface MarketDataProvider {
  name: string;
  isAvailable(): boolean;
  fetchOHLC(
    symbol: string, 
    timeWindow: TimeWindow, 
    tradeContext?: TradeContext
  ): Promise<OHLCData[]>;
}

export interface CacheEntry {
  data: MarketDataResponse;
  timestamp: number;
  expires: number;
  source: string;
}

export interface MarketDataConfig {
  cacheEnabled: boolean;
  cacheExpiryHours: number;
  fallbackToMock: boolean;
  preferredInterval: '1m' | '5m' | '15m' | '1h';
  maxRetries: number;
}