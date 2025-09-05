import { ExecutionOrder } from '@/components/ExecutionsTable';
import { OHLCData } from '@/lib/marketData/types';

export interface TradeMetrics {
  mfe: number;           // Maximum Favorable Excursion (max unrealized profit)
  mae: number;           // Maximum Adverse Excursion (max unrealized loss)
  mfeRatio: number;      // MFE/MAE ratio (reward to risk)
  mfePrice: number;      // Price at MFE
  maePrice: number;      // Price at MAE
  mfeTime?: Date;        // Time when MFE occurred
  maeTime?: Date;        // Time when MAE occurred
  entryPrice: number;    // Average entry price
  exitPrice?: number;    // Average exit price (if closed)
  realizedPnl?: number;  // Actual P&L if trade is closed
  efficiency?: number;   // How much of MFE was captured (realizedPnl/mfe)
}

export interface TradePosition {
  symbol: string;
  executions: ExecutionOrder[];
  ohlcData: OHLCData[];
}

/**
 * Calculate MFE and MAE metrics for a trade using execution and candlestick data
 */
export function calculateTradeMetrics(position: TradePosition): TradeMetrics | null {
  const { executions, ohlcData } = position;

  if (!executions || executions.length === 0) {
    console.warn('No executions provided for trade metrics calculation');
    return null;
  }

  if (!ohlcData || ohlcData.length === 0) {
    console.warn('No OHLC data available for trade metrics calculation');
    return null;
  }

  // Separate buy and sell executions
  const buyExecutions = executions.filter(e => e.side === 'BUY');
  const sellExecutions = executions.filter(e => e.side === 'SELL');

  if (buyExecutions.length === 0 && sellExecutions.length === 0) {
    console.warn('No valid executions found');
    return null;
  }

  // Determine trade direction (long or short)
  const isLongTrade = buyExecutions.length > 0 && 
    (!sellExecutions.length || 
     new Date(buyExecutions[0].orderExecutedTime!) < new Date(sellExecutions[0].orderExecutedTime!));

  // Calculate weighted average entry and exit prices
  const entryExecutions = isLongTrade ? buyExecutions : sellExecutions;
  const exitExecutions = isLongTrade ? sellExecutions : buyExecutions;

  const entryPrice = calculateWeightedAveragePrice(entryExecutions);
  const exitPrice = exitExecutions.length > 0 ? calculateWeightedAveragePrice(exitExecutions) : undefined;

  // Find entry and exit times
  const entryTime = getEarliestExecutionTime(entryExecutions);
  const exitTime = exitExecutions.length > 0 ? getLatestExecutionTime(exitExecutions) : undefined;

  // Filter OHLC data to the trade period
  const tradeOhlcData = filterOhlcDataForTradePeriod(ohlcData, entryTime, exitTime);

  if (tradeOhlcData.length === 0) {
    console.warn('No OHLC data found within trade period');
    return null;
  }

  // Calculate MFE and MAE based on trade direction
  const { mfe, mae, mfePrice, maePrice, mfeTime, maeTime } = isLongTrade
    ? calculateLongTradeMetrics(entryPrice, tradeOhlcData)
    : calculateShortTradeMetrics(entryPrice, tradeOhlcData);

  // Calculate MFE/MAE ratio (avoid division by zero)
  const mfeRatio = mae > 0 ? mfe / mae : mfe > 0 ? Infinity : 0;

  // Calculate realized P&L if trade is closed
  let realizedPnl: number | undefined;
  let efficiency: number | undefined;
  
  if (exitPrice !== undefined) {
    const totalEntryQty = entryExecutions.reduce((sum, e) => sum + e.orderQuantity, 0);
    const totalExitQty = exitExecutions.reduce((sum, e) => sum + e.orderQuantity, 0);
    const closedQty = Math.min(totalEntryQty, totalExitQty);
    
    realizedPnl = isLongTrade 
      ? (exitPrice - entryPrice) * closedQty
      : (entryPrice - exitPrice) * closedQty;
    
    // Calculate efficiency (what % of MFE was captured)
    if (mfe > 0) {
      const maxPossibleProfit = mfe * closedQty;
      efficiency = (realizedPnl / maxPossibleProfit) * 100;
    }
  }

  return {
    mfe,
    mae,
    mfeRatio,
    mfePrice,
    maePrice,
    mfeTime,
    maeTime,
    entryPrice,
    exitPrice,
    realizedPnl,
    efficiency
  };
}

/**
 * Calculate weighted average price from executions
 */
function calculateWeightedAveragePrice(executions: ExecutionOrder[]): number {
  if (executions.length === 0) return 0;

  let totalValue = 0;
  let totalQuantity = 0;

  for (const execution of executions) {
    const price = Number(execution.limitPrice) || 0;
    const quantity = execution.orderQuantity;
    totalValue += price * quantity;
    totalQuantity += quantity;
  }

  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
}

/**
 * Get earliest execution time from a list of executions
 */
function getEarliestExecutionTime(executions: ExecutionOrder[]): Date {
  const times = executions
    .map(e => e.orderExecutedTime)
    .filter(t => t != null)
    .map(t => new Date(t!));
  
  return times.length > 0 
    ? new Date(Math.min(...times.map(t => t.getTime())))
    : new Date();
}

/**
 * Get latest execution time from a list of executions
 */
function getLatestExecutionTime(executions: ExecutionOrder[]): Date {
  const times = executions
    .map(e => e.orderExecutedTime)
    .filter(t => t != null)
    .map(t => new Date(t!));
  
  return times.length > 0 
    ? new Date(Math.max(...times.map(t => t.getTime())))
    : new Date();
}

/**
 * Filter OHLC data to only include candles within the trade period
 */
function filterOhlcDataForTradePeriod(
  ohlcData: OHLCData[],
  entryTime: Date,
  exitTime?: Date
): OHLCData[] {
  const entryTimestamp = entryTime.getTime();
  const exitTimestamp = exitTime ? exitTime.getTime() : Date.now();

  return ohlcData.filter(candle => {
    return candle.timestamp >= entryTimestamp && candle.timestamp <= exitTimestamp;
  });
}

/**
 * Calculate MFE and MAE for a long trade
 */
function calculateLongTradeMetrics(
  entryPrice: number,
  ohlcData: OHLCData[]
): {
  mfe: number;
  mae: number;
  mfePrice: number;
  maePrice: number;
  mfeTime?: Date;
  maeTime?: Date;
} {
  let highestPrice = entryPrice;
  let lowestPrice = entryPrice;
  let mfeTime: Date | undefined;
  let maeTime: Date | undefined;

  for (const candle of ohlcData) {
    if (candle.high > highestPrice) {
      highestPrice = candle.high;
      mfeTime = new Date(candle.timestamp);
    }
    if (candle.low < lowestPrice) {
      lowestPrice = candle.low;
      maeTime = new Date(candle.timestamp);
    }
  }

  // For long trades:
  // MFE = maximum profit = highest price - entry price
  // MAE = maximum loss = entry price - lowest price
  const mfe = Math.max(0, highestPrice - entryPrice);
  const mae = Math.max(0, entryPrice - lowestPrice);

  return {
    mfe,
    mae,
    mfePrice: highestPrice,
    maePrice: lowestPrice,
    mfeTime,
    maeTime
  };
}

/**
 * Calculate MFE and MAE for a short trade
 */
function calculateShortTradeMetrics(
  entryPrice: number,
  ohlcData: OHLCData[]
): {
  mfe: number;
  mae: number;
  mfePrice: number;
  maePrice: number;
  mfeTime?: Date;
  maeTime?: Date;
} {
  let highestPrice = entryPrice;
  let lowestPrice = entryPrice;
  let mfeTime: Date | undefined;
  let maeTime: Date | undefined;

  for (const candle of ohlcData) {
    if (candle.high > highestPrice) {
      highestPrice = candle.high;
      maeTime = new Date(candle.timestamp);
    }
    if (candle.low < lowestPrice) {
      lowestPrice = candle.low;
      mfeTime = new Date(candle.timestamp);
    }
  }

  // For short trades:
  // MFE = maximum profit = entry price - lowest price
  // MAE = maximum loss = highest price - entry price
  const mfe = Math.max(0, entryPrice - lowestPrice);
  const mae = Math.max(0, highestPrice - entryPrice);

  return {
    mfe,
    mae,
    mfePrice: lowestPrice,
    maePrice: highestPrice,
    mfeTime,
    maeTime
  };
}

/**
 * Calculate aggregated MFE/MAE metrics for multiple trades
 */
export function calculateAggregatedMetrics(trades: TradeMetrics[]): {
  avgMfeRatio: number;
  avgEfficiency: number;
  totalMfe: number;
  totalMae: number;
  winCount: number;
  lossCount: number;
} {
  if (trades.length === 0) {
    return {
      avgMfeRatio: 0,
      avgEfficiency: 0,
      totalMfe: 0,
      totalMae: 0,
      winCount: 0,
      lossCount: 0
    };
  }

  let totalMfe = 0;
  let totalMae = 0;
  let totalEfficiency = 0;
  let validEfficiencyCount = 0;
  let winCount = 0;
  let lossCount = 0;

  for (const trade of trades) {
    totalMfe += trade.mfe;
    totalMae += trade.mae;
    
    if (trade.efficiency !== undefined) {
      totalEfficiency += trade.efficiency;
      validEfficiencyCount++;
    }
    
    if (trade.realizedPnl !== undefined) {
      if (trade.realizedPnl > 0) winCount++;
      else if (trade.realizedPnl < 0) lossCount++;
    }
  }

  const avgMfeRatio = totalMae > 0 ? totalMfe / totalMae : 0;
  const avgEfficiency = validEfficiencyCount > 0 ? totalEfficiency / validEfficiencyCount : 0;

  return {
    avgMfeRatio,
    avgEfficiency,
    totalMfe,
    totalMae,
    winCount,
    lossCount
  };
}