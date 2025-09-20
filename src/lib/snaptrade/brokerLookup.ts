import { prisma } from '@/lib/prisma';
import { BrokerType } from '@prisma/client';

// Cache for broker lookups to avoid repeated database queries
const brokerCache = new Map<string, BrokerType>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
let lastCacheRefresh = 0;

// Mapping of SnapTrade institution names to BrokerType enum values
const INSTITUTION_TO_BROKER_TYPE: Record<string, BrokerType> = {
  // Direct mappings
  'Alpaca': BrokerType.ALPACA,
  'Binance': BrokerType.BINANCE,
  'Chase': BrokerType.CHASE,
  'Coinbase': BrokerType.COINBASE,
  'Degiro': BrokerType.DEGIRO,
  'E*Trade': BrokerType.E_TRADE,
  'Fidelity': BrokerType.FIDELITY,
  'Kraken': BrokerType.KRAKEN,
  'Public': BrokerType.PUBLIC,
  'Questrade': BrokerType.QUESTRADE,
  'Robinhood': BrokerType.ROBINHOOD,
  'Schwab': BrokerType.CHARLES_SCHWAB,
  'Charles Schwab': BrokerType.CHARLES_SCHWAB,
  'Schwab OAuth': BrokerType.CHARLES_SCHWAB,
  'tastytrade': BrokerType.TASTYTRADE,
  'TD Direct Investing': BrokerType.TD_AMERITRADE,
  'TD Ameritrade': BrokerType.TD_AMERITRADE,
  'Tradier': BrokerType.TRADIER,
  'Trading212': BrokerType.TRADING212,
  'Vanguard US': BrokerType.VANGUARD,
  'Wealthsimple': BrokerType.WEALTHSIMPLE,
  'Webull US': BrokerType.WEBULL,
  'Webull US OAuth': BrokerType.WEBULL,
  'Zerodha': BrokerType.ZERODHA,

  // Additional common variations
  'E-Trade': BrokerType.E_TRADE,
  'ETRADE': BrokerType.E_TRADE,
  'Interactive Brokers': BrokerType.INTERACTIVE_BROKERS,
  'IBKR': BrokerType.INTERACTIVE_BROKERS,
  'IB': BrokerType.INTERACTIVE_BROKERS,
  'Vanguard': BrokerType.VANGUARD,
  'Fidelity Investments': BrokerType.FIDELITY,
  'Charles Schwab & Co': BrokerType.CHARLES_SCHWAB,
  'Coinbase Pro': BrokerType.COINBASE,
  'Coinbase Advanced Trade': BrokerType.COINBASE,
  'Public.com': BrokerType.PUBLIC,
  'Questrade Inc': BrokerType.QUESTRADE,
  'Questrade OAuth': BrokerType.QUESTRADE,
  'Robinhood Markets': BrokerType.ROBINHOOD,
  'Robinhood Financial': BrokerType.ROBINHOOD,
  'Stake': BrokerType.STAKE,
  'Stake Australia': BrokerType.STAKE,
  'Webull': BrokerType.WEBULL,
  'Webull Corporation': BrokerType.WEBULL,
  'AJ Bell': BrokerType.AJ_BELL,
  'AJ Bell Youinvest': BrokerType.AJ_BELL,
  'JPMorgan Chase': BrokerType.CHASE,
  'Chase Self Directed': BrokerType.CHASE,
  'Chase You Invest': BrokerType.CHASE,
};

/**
 * Refresh the broker cache from the database
 */
async function refreshBrokerCache(): Promise<void> {
  const now = Date.now();

  // Only refresh if cache is stale
  if (now - lastCacheRefresh < CACHE_TTL) {
    return;
  }

  try {
    // Get all broker aliases with their associated broker information
    const aliases = await prisma.brokerAlias.findMany({
      include: {
        broker: true
      }
    });

    // Clear current cache
    brokerCache.clear();

    // Populate cache with database mappings
    for (const alias of aliases) {
      // Map alias to the broker's corresponding BrokerType
      const brokerType = getBrokerTypeFromName(alias.broker.name);
      if (brokerType) {
        brokerCache.set(alias.alias.toLowerCase(), brokerType);
      }
    }

    // Add static mappings from our hardcoded list
    for (const [institution, brokerType] of Object.entries(INSTITUTION_TO_BROKER_TYPE)) {
      brokerCache.set(institution.toLowerCase(), brokerType);
    }

    lastCacheRefresh = now;
    console.log(`[BROKER_LOOKUP] Cache refreshed with ${brokerCache.size} entries`);

  } catch (error) {
    console.error('[BROKER_LOOKUP] Failed to refresh broker cache:', error);
    // On error, use static mappings only
    brokerCache.clear();
    for (const [institution, brokerType] of Object.entries(INSTITUTION_TO_BROKER_TYPE)) {
      brokerCache.set(institution.toLowerCase(), brokerType);
    }
    lastCacheRefresh = now;
  }
}

/**
 * Map broker name to BrokerType enum
 */
function getBrokerTypeFromName(brokerName: string): BrokerType | null {
  const name = brokerName.toLowerCase();

  // Direct mappings
  if (name.includes('alpaca')) return BrokerType.ALPACA;
  if (name.includes('binance')) return BrokerType.BINANCE;
  if (name.includes('chase')) return BrokerType.CHASE;
  if (name.includes('coinbase')) return BrokerType.COINBASE;
  if (name.includes('degiro')) return BrokerType.DEGIRO;
  if (name.includes('etrade') || name.includes('e*trade') || name.includes('e-trade')) return BrokerType.E_TRADE;
  if (name.includes('fidelity')) return BrokerType.FIDELITY;
  if (name.includes('interactive') && name.includes('brokers')) return BrokerType.INTERACTIVE_BROKERS;
  if (name.includes('kraken')) return BrokerType.KRAKEN;
  if (name.includes('public')) return BrokerType.PUBLIC;
  if (name.includes('questrade')) return BrokerType.QUESTRADE;
  if (name.includes('robinhood')) return BrokerType.ROBINHOOD;
  if (name.includes('schwab') || name.includes('charles schwab')) return BrokerType.CHARLES_SCHWAB;
  if (name.includes('stake')) return BrokerType.STAKE;
  if (name.includes('tastytrade')) return BrokerType.TASTYTRADE;
  if (name.includes('td') && (name.includes('ameritrade') || name.includes('direct'))) return BrokerType.TD_AMERITRADE;
  if (name.includes('tradier')) return BrokerType.TRADIER;
  if (name.includes('trading212')) return BrokerType.TRADING212;
  if (name.includes('vanguard')) return BrokerType.VANGUARD;
  if (name.includes('wealthsimple')) return BrokerType.WEALTHSIMPLE;
  if (name.includes('webull')) return BrokerType.WEBULL;
  if (name.includes('zerodha')) return BrokerType.ZERODHA;
  if (name.includes('aj bell')) return BrokerType.AJ_BELL;

  return null;
}

/**
 * Look up broker type by SnapTrade institution name
 * Uses cached mappings for performance
 */
export async function lookupBrokerType(institution: string): Promise<BrokerType> {
  if (!institution) {
    return BrokerType.GENERIC_CSV;
  }

  // Ensure cache is fresh
  await refreshBrokerCache();

  // Try exact match first (case-insensitive)
  const exactMatch = brokerCache.get(institution.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }

  // Try partial matches for institutions not in our mappings
  const institutionLower = institution.toLowerCase();

  for (const [cachedInstitution, brokerType] of brokerCache.entries()) {
    if (institutionLower.includes(cachedInstitution) || cachedInstitution.includes(institutionLower)) {
      // Cache this match for future lookups
      brokerCache.set(institutionLower, brokerType);
      return brokerType;
    }
  }

  // Try direct broker type mapping as fallback
  const directMapping = getBrokerTypeFromName(institution);
  if (directMapping) {
    // Cache this match
    brokerCache.set(institutionLower, directMapping);
    return directMapping;
  }

  console.warn(`[BROKER_LOOKUP] No broker mapping found for institution: "${institution}"`);
  return BrokerType.GENERIC_CSV;
}

/**
 * Get all cached broker mappings (for debugging)
 */
export async function getBrokerMappings(): Promise<Map<string, BrokerType>> {
  await refreshBrokerCache();
  return new Map(brokerCache);
}

/**
 * Clear the broker cache (useful for testing or force refresh)
 */
export function clearBrokerCache(): void {
  brokerCache.clear();
  lastCacheRefresh = 0;
}

/**
 * Check if an institution has a known broker mapping
 */
export async function isKnownBroker(institution: string): Promise<boolean> {
  if (!institution) return false;

  const brokerType = await lookupBrokerType(institution);
  return brokerType !== BrokerType.GENERIC_CSV;
}