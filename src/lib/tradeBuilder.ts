import { Order, OrderSide, TradeSide, TradeStatus } from '@prisma/client';
import { ordersRepo } from './repositories/ordersRepo';
import { tradesRepo, CreateTradeData } from './repositories/tradesRepo';
import { Decimal } from '@prisma/client/runtime/library';

export interface OpenPosition {
  symbol: string;
  side: TradeSide;
  openQuantity: number;
  totalCostBasis: number;
  openTime: Date;
  orderIds: string[];
}

export interface ProcessedTrade {
  id: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  openTime: Date;
  closeTime?: Date;
  avgEntryPrice?: number;
  avgExitPrice?: number;
  openQuantity?: number;
  closeQuantity?: number;
  pnl: number;
  ordersInTrade: string[];
}

export class TradeBuilder {
  private openPositions: Map<string, OpenPosition> = new Map();
  private newTrades: ProcessedTrade[] = [];

  /**
   * Main function to process user orders and create trades
   */
  async processUserOrders(userId: string): Promise<ProcessedTrade[]> {
    this.openPositions.clear();
    this.newTrades = [];

    // Load existing open positions
    await this.loadExistingOpenPositions(userId);

    // Get unprocessed orders
    const orders = await ordersRepo.getUnprocessedOrders(userId);
    
    console.log(`Processing ${orders.length} unprocessed orders for user ${userId}`);

    // Process each order in chronological order
    for (const order of orders) {
      await this.processOrder(order);
    }

    console.log(`Created ${this.newTrades.length} new trades`);
    return this.newTrades;
  }

  /**
   * Load existing open positions from the database
   */
  private async loadExistingOpenPositions(userId: string): Promise<void> {
    const openTrades = await tradesRepo.getAllOpenTrades(userId);
    
    for (const trade of openTrades) {
      const positionKey = trade.symbol;
      this.openPositions.set(positionKey, {
        symbol: trade.symbol,
        side: trade.side,
        openQuantity: trade.openQuantity || 0,
        totalCostBasis: trade.costBasis || 0,
        openTime: trade.openTime || trade.entryDate,
        orderIds: trade.ordersInTrade,
      });
    }
  }

  /**
   * Process a single order
   */
  private async processOrder(order: Order): Promise<void> {
    if (!order.orderExecutedTime || !order.limitPrice) {
      console.warn(`Order ${order.orderId} missing execution time or price, skipping`);
      return;
    }

    const symbol = order.symbol;
    const orderSide = order.side;
    const quantity = order.orderQuantity;
    const price = order.limitPrice;
    const orderTime = order.orderExecutedTime;

    const tradeSide = orderSide === OrderSide.BUY ? TradeSide.LONG : TradeSide.SHORT;
    const existingPosition = this.openPositions.get(symbol);

    if (!existingPosition) {
      // No existing position - open new position
      await this.openNewPosition(symbol, tradeSide, quantity, price, orderTime, order.orderId);
    } else {
      // Existing position - check if same or opposite side
      if (existingPosition.side === tradeSide) {
        // Same side - add to position
        this.addToPosition(existingPosition, quantity, price, order.orderId);
      } else {
        // Opposite side - close or reverse position
        await this.handleOppositeOrder(existingPosition, quantity, price, orderTime, order.orderId);
      }
    }
  }

  /**
   * Open a new position
   */
  private async openNewPosition(
    symbol: string,
    side: TradeSide,
    quantity: number,
    price: number,
    openTime: Date,
    orderId: string
  ): Promise<void> {
    const position: OpenPosition = {
      symbol,
      side,
      openQuantity: quantity,
      totalCostBasis: quantity * price,
      openTime,
      orderIds: [orderId],
    };

    this.openPositions.set(symbol, position);

    // Create open trade in database
    const tradeData: CreateTradeData = {
      userId: '', // Will be set by caller
      symbol,
      side,
      status: TradeStatus.OPEN,
      openTime,
      avgEntryPrice: new Decimal(price),
      openQuantity: quantity,
      pnl: 0,
      ordersInTrade: [orderId],
      ordersCount: 1,
      quantity,
      costBasis: quantity * price,
    };

    // Note: We'll save this when the caller provides userId
    this.newTrades.push({
      id: '', // Will be set after saving
      symbol,
      side,
      status: TradeStatus.OPEN,
      openTime,
      avgEntryPrice: price,
      openQuantity: quantity,
      pnl: 0,
      ordersInTrade: [orderId],
    });
  }

  /**
   * Add to existing position (same side)
   */
  private addToPosition(
    position: OpenPosition,
    quantity: number,
    price: number,
    orderId: string
  ): void {
    // Update position
    const newTotalQuantity = position.openQuantity + quantity;
    const newTotalCostBasis = position.totalCostBasis + (quantity * price);
    
    position.openQuantity = newTotalQuantity;
    position.totalCostBasis = newTotalCostBasis;
    position.orderIds.push(orderId);

    // Update the corresponding open trade in our tracking
    const existingTradeIndex = this.newTrades.findIndex(
      t => t.symbol === position.symbol && t.status === TradeStatus.OPEN
    );
    
    if (existingTradeIndex >= 0) {
      const trade = this.newTrades[existingTradeIndex];
      trade.openQuantity = newTotalQuantity;
      trade.avgEntryPrice = newTotalCostBasis / newTotalQuantity;
      trade.ordersInTrade.push(orderId);
    }
  }

  /**
   * Handle opposite side order (close or reverse position)
   */
  private async handleOppositeOrder(
    position: OpenPosition,
    quantity: number,
    price: number,
    orderTime: Date,
    orderId: string
  ): Promise<void> {
    const closingQuantity = Math.min(quantity, position.openQuantity);
    const remainingQuantity = quantity - closingQuantity;

    // Calculate PnL for the closing portion
    const avgEntryPrice = position.totalCostBasis / position.openQuantity;
    const pnl = position.side === TradeSide.LONG
      ? (price - avgEntryPrice) * closingQuantity
      : (avgEntryPrice - price) * closingQuantity;

    // Create closed trade
    const closedTrade: ProcessedTrade = {
      id: '',
      symbol: position.symbol,
      side: position.side,
      status: TradeStatus.CLOSED,
      openTime: position.openTime,
      closeTime: orderTime,
      avgEntryPrice,
      avgExitPrice: price,
      openQuantity: closingQuantity,
      closeQuantity: closingQuantity,
      pnl,
      ordersInTrade: [...position.orderIds, orderId],
    };

    this.newTrades.push(closedTrade);

    if (remainingQuantity > 0) {
      // Reverse position - create new position in opposite direction
      const newSide = position.side === TradeSide.LONG ? TradeSide.SHORT : TradeSide.LONG;
      
      const newPosition: OpenPosition = {
        symbol: position.symbol,
        side: newSide,
        openQuantity: remainingQuantity,
        totalCostBasis: remainingQuantity * price,
        openTime: orderTime,
        orderIds: [orderId],
      };

      this.openPositions.set(position.symbol, newPosition);

      // Create new open trade
      this.newTrades.push({
        id: '',
        symbol: position.symbol,
        side: newSide,
        status: TradeStatus.OPEN,
        openTime: orderTime,
        avgEntryPrice: price,
        openQuantity: remainingQuantity,
        pnl: 0,
        ordersInTrade: [orderId],
      });
    } else if (closingQuantity === position.openQuantity) {
      // Exact close - remove position
      this.openPositions.delete(position.symbol);
    } else {
      // Partial close - update position
      position.openQuantity -= closingQuantity;
      position.totalCostBasis -= (avgEntryPrice * closingQuantity);
      position.orderIds.push(orderId);
    }
  }

  /**
   * Persist trades to database and link orders
   */
  async persistTrades(userId: string): Promise<void> {
    for (const trade of this.newTrades) {
      const tradeData: CreateTradeData = {
        userId,
        symbol: trade.symbol,
        side: trade.side,
        status: trade.status,
        openTime: trade.openTime,
        closeTime: trade.closeTime,
        avgEntryPrice: trade.avgEntryPrice ? new Decimal(trade.avgEntryPrice) : undefined,
        avgExitPrice: trade.avgExitPrice ? new Decimal(trade.avgExitPrice) : undefined,
        openQuantity: trade.openQuantity,
        closeQuantity: trade.closeQuantity,
        pnl: trade.pnl,
        ordersInTrade: trade.ordersInTrade,
        ordersCount: trade.ordersInTrade.length,
        quantity: trade.closeQuantity || trade.openQuantity,
        costBasis: trade.avgEntryPrice && trade.openQuantity 
          ? trade.avgEntryPrice * trade.openQuantity 
          : undefined,
        proceeds: trade.avgExitPrice && trade.closeQuantity 
          ? trade.avgExitPrice * trade.closeQuantity 
          : undefined,
      };

      const savedTrade = await tradesRepo.saveTrade(tradeData);
      trade.id = savedTrade.id;

      // Link orders to this trade
      await ordersRepo.updateOrdersWithTradeId(trade.ordersInTrade, savedTrade.id);
    }
  }
}

/**
 * Main function to process user orders
 * This is the primary entry point for trade processing
 */
export async function processUserOrders(userId: string): Promise<ProcessedTrade[]> {
  const builder = new TradeBuilder();
  const trades = await builder.processUserOrders(userId);
  await builder.persistTrades(userId);
  return trades;
}