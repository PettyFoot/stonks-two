import { SnapTradeActivity } from './types';
import { TradeSide, OrderSide, TradeSource, AssetClass, TradeStatus, OrderType, TimeInForce, OrderStatus, BrokerType } from '@prisma/client';

/**
 * Map SnapTrade activity to our trade format
 */
export function mapSnapTradeActivityToTrade(
  activity: SnapTradeActivity,
  userId: string,
  connectionId: string,
  accountId: string
) {
  // Determine trade side based on activity type and quantity
  const isBuy = activity.type === 'BUY' || activity.quantity > 0;
  const side = isBuy ? TradeSide.LONG : TradeSide.SHORT;
  const orderSide = isBuy ? OrderSide.BUY : OrderSide.SELL;

  // Map asset class
  const assetClass = mapAssetClass(activity.symbol?.description || '');

  // Parse dates
  const tradeDate = new Date(activity.trade_date);
  const settlementDate = activity.settlement_date ? new Date(activity.settlement_date) : null;

  // Calculate quantities and prices
  const quantity = Math.abs(activity.quantity);
  const price = activity.price || 0;
  const grossAmount = quantity * price;

  // Determine if this is a complete trade or needs pairing
  const status = TradeStatus.CLOSED; // SnapTrade activities are typically complete executions

  return {
    userId,
    symbol: activity.symbol?.symbol || '',
    assetClass,
    brokerName: activity.institution || 'Unknown',
    tradeSource: TradeSource.API,
    orderType: OrderType.MARKET, // Default, SnapTrade doesn't provide order type in activities
    side,
    timeInForce: TimeInForce.DAY, // Default
    status,

    // Trade timing
    entryDate: tradeDate,
    exitDate: tradeDate, // For complete trades, entry and exit are the same
    date: tradeDate,
    openTime: tradeDate,
    closeTime: tradeDate,

    // Price and quantity data
    entryPrice: price,
    exitPrice: price,
    quantity,
    avgEntryPrice: price,
    avgExitPrice: price,
    averageFillPrice: price,

    // P&L calculations (simplified for single activities)
    pnl: 0, // Will be calculated later by trade calculation logic
    costBasis: isBuy ? grossAmount : 0,
    proceeds: !isBuy ? grossAmount : 0,

    // Execution details
    executions: 1,
    openQuantity: 0, // Trade is closed
    closeQuantity: quantity,

    // Additional fields
    notes: activity.description || '',
    tags: [activity.type, activity.institution].filter(Boolean),

    // Order-level data (create a corresponding order)
    orderData: {
      orderId: `ST-${activity.id}`, // Prefix with ST for SnapTrade
      symbol: activity.symbol?.symbol || '',
      orderType: OrderType.MARKET,
      side: orderSide,
      timeInForce: TimeInForce.DAY,
      orderQuantity: quantity,
      limitPrice: price,
      orderStatus: OrderStatus.FILLED,
      orderPlacedTime: tradeDate,
      orderExecutedTime: tradeDate,
      accountId,
      brokerType: BrokerType.GENERIC_CSV, // Will be mapped to specific broker later
    },
  };
}

/**
 * Map symbol description to asset class
 */
function mapAssetClass(description: string): AssetClass {
  const desc = description.toLowerCase();
  
  if (desc.includes('option') || desc.includes('call') || desc.includes('put')) {
    return AssetClass.OPTIONS;
  }
  
  if (desc.includes('future') || desc.includes('contract')) {
    return AssetClass.FUTURES;
  }
  
  if (desc.includes('forex') || desc.includes('fx') || desc.includes('currency')) {
    return AssetClass.FOREX;
  }
  
  if (desc.includes('crypto') || desc.includes('bitcoin') || desc.includes('ethereum')) {
    return AssetClass.CRYPTO;
  }
  
  if (desc.includes('bond') || desc.includes('treasury')) {
    return AssetClass.EQUITY; // Map bonds to equity since BOND asset class doesn't exist
  }

  if (desc.includes('etf') || desc.includes('fund')) {
    return AssetClass.EQUITY; // Map ETFs to equity since ETF asset class doesn't exist
  }

  if (desc.includes('mutual')) {
    return AssetClass.EQUITY; // Map mutual funds to equity since MUTUAL_FUND asset class doesn't exist
  }
  
  // Default to equity
  return AssetClass.EQUITY;
}

/**
 * Map SnapTrade broker name to our broker type
 */
export function mapBrokerType(brokerName: string): BrokerType {
  const name = brokerName.toLowerCase();
  
  if (name.includes('interactive') && name.includes('brokers')) {
    return BrokerType.INTERACTIVE_BROKERS;
  }
  
  if (name.includes('td') && name.includes('ameritrade')) {
    return BrokerType.TD_AMERITRADE;
  }
  
  if (name.includes('etrade') || name.includes('e*trade')) {
    return BrokerType.E_TRADE;
  }
  
  if (name.includes('schwab')) {
    return BrokerType.CHARLES_SCHWAB;
  }
  
  if (name.includes('fidelity')) {
    return BrokerType.FIDELITY;
  }
  
  if (name.includes('robinhood')) {
    return BrokerType.ROBINHOOD;
  }
  
  // Default to generic CSV
  return BrokerType.GENERIC_CSV;
}

/**
 * Validate SnapTrade activity before processing
 */
export function validateSnapTradeActivity(activity: SnapTradeActivity): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!activity.id) {
    errors.push('Activity ID is required');
  }
  
  if (!activity.symbol?.symbol) {
    errors.push('Symbol is required');
  }
  
  if (!activity.trade_date) {
    errors.push('Trade date is required');
  }
  
  if (activity.quantity === undefined || activity.quantity === null) {
    errors.push('Quantity is required');
  }
  
  if (activity.price === undefined || activity.price === null || activity.price < 0) {
    errors.push('Valid price is required');
  }
  
  if (!activity.type) {
    errors.push('Activity type is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract trade metadata from SnapTrade activity
 */
export function extractTradeMetadata(activity: SnapTradeActivity) {
  return {
    snapTradeActivityId: activity.id,
    originalType: activity.type,
    institution: activity.institution,
    description: activity.description,
    currency: activity.currency?.code,
    fxRate: activity.fx_rate,
    settlementDate: activity.settlement_date,
    exchange: activity.symbol?.exchange?.code,
    optionType: activity.option_type,
    optionStrikePrice: activity.option_strike_price,
    optionExpirationDate: activity.option_expiration_date,
  };
}

/**
 * Convert SnapTrade date string to Date object
 */
export function parseSnapTradeDate(dateString: string): Date {
  // SnapTrade dates are typically in YYYY-MM-DD format
  return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Format trade data for bulk insert
 */
export function formatTradeForBulkInsert(
  activity: SnapTradeActivity,
  userId: string,
  connectionId: string,
  accountId: string
) {
  const tradeData = mapSnapTradeActivityToTrade(activity, userId, connectionId, accountId);
  
  return {
    ...tradeData,
    createdAt: new Date(),
    updatedAt: new Date(),
    isCalculated: false, // Will be processed by trade calculation logic
  };
}