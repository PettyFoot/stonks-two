import { Snaptrade } from 'snaptrade-typescript-sdk';
import { SnapTradeConfig } from './types';

let snapTradeClientCache: { client: Snaptrade; timestamp: number } | null = null;
const CLIENT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export function initializeSnapTrade(config: SnapTradeConfig): Snaptrade {
  if (!config.clientId || !config.consumerKey) {
    throw new Error('SnapTrade client ID and consumer key are required');
  }

  const client = new Snaptrade({
    clientId: config.clientId,
    consumerKey: config.consumerKey,
    timestamp: Math.floor(Date.now() / 1000).toString(), // Unix timestamp in seconds as string
    basePath: config.baseUrl || 'https://api.snaptrade.com/api/v1',
  });

  return client;
}

export function getSnapTradeClient(): Snaptrade {
  const now = Date.now();

  // Check if we need to create a new client (first time or cache expired)
  if (!snapTradeClientCache || (now - snapTradeClientCache.timestamp) > CLIENT_REFRESH_INTERVAL) {
    const config: SnapTradeConfig = {
      clientId: process.env.SNAPTRADE_CLIENT_ID || '',
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY || '',
      webhookSecret: process.env.SNAPTRADE_WEBHOOK_SECRET,
      baseUrl: process.env.SNAPTRADE_BASE_URL,
    };

    if (!config.clientId || !config.consumerKey) {
      throw new Error('SnapTrade configuration is missing. Please check environment variables.');
    }

    const client = initializeSnapTrade(config);
    snapTradeClientCache = {
      client,
      timestamp: now
    };

    console.log(`[SNAPTRADE] Created new client with fresh timestamp: ${Math.floor(Date.now() / 1000)}`);
  }

  return snapTradeClientCache.client;
}

export function isSnapTradeConfigured(): boolean {
  return !!(
    process.env.SNAPTRADE_CLIENT_ID && 
    process.env.SNAPTRADE_CONSUMER_KEY
  );
}

// Utility function to handle SnapTrade API errors
export function handleSnapTradeError(error: any): string {
  if (error?.response?.data?.detail) {
    // Handle validation errors from SnapTrade API
    const details = error.response.data.detail;
    if (Array.isArray(details)) {
      return details.map((d: any) => d.msg).join(', ');
    }
    return details;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred while communicating with SnapTrade';
}

// Rate limiting helper
export class RateLimitHelper {
  private static requestTimes: number[] = [];
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;
  private static readonly WINDOW_MS = 60000; // 1 minute

  static async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.WINDOW_MS
    );

    if (this.requestTimes.length >= this.MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.WINDOW_MS - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.checkRateLimit();
      }
    }

    this.requestTimes.push(now);
  }
}