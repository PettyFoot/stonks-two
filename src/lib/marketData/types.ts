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
  source: 'alpha_vantage' | 'polygon';  // Track data source
  cached?: boolean;          // Whether data came from cache
  delayed?: boolean;         // Whether data is delayed (15-minute delay)
  rateLimitInfo?: RateLimitInfo;  // Rate limit information when applicable
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

export interface ProviderResponse {
  data: OHLCData[];
  delayed?: boolean;
}

export interface MarketDataProvider {
  name: string;
  isAvailable(): boolean;
  fetchOHLC(
    symbol: string,
    timeWindow: TimeWindow,
    tradeContext?: TradeContext
  ): Promise<OHLCData[] | ProviderResponse>;
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

// API Usage Tracking Types
export interface ApiUsageRecord {
  id: string;
  userId: string;
  apiProvider: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  countedForLimit: boolean;
  subscriptionTier: string;
  responseStatusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  callsMade: number;
  callsRemaining: number | null;
  resetAt: Date;
  subscriptionTier: 'FREE' | 'PREMIUM';
}

export interface ApiUsageTrackingOptions {
  provider: string;
  endpoint: string;
  method?: string;
  requestParams?: Record<string, any>;
}