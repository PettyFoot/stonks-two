import { Order, OrderSide, TradeSide, TradeStatus, HoldingPeriod } from '@prisma/client';
import { ordersRepo } from './repositories/ordersRepo';
import { tradesRepo, CreateTradeData } from './repositories/tradesRepo';
import { Decimal } from '@prisma/client/runtime/library';

export interface OpenPosition {
  symbol: string;
  side: TradeSide;
  brokerId: string | null; // Broker ID to ensure trades from different brokers are tracked separately
  openQuantity: number;
  totalCostBasis: number;
  openTime: Date;
  orderIds: string[];
  existingTradeId?: string; // Track if this position came from an existing trade
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
   * Calculate total quantity across all orders in a trade
   */
  private async calculateTotalQuantity(orderIds: string[]): Promise<number> {
    const orders = await ordersRepo.getOrdersByIds(orderIds);
    return orders.reduce((total, order) => total + order.orderQuantity, 0);
  }

  /**
   * Calculate time in trade in seconds
   */
  private calculateTimeInTrade(openTime: Date, closeTime?: Date): number {
    const endTime = closeTime || new Date();
    return Math.floor((endTime.getTime() - openTime.getTime()) / 1000);
  }

  /**
   * Calculate average exit price for trades
   */
  private async calculateAvgExitPrice(orderIds: string[], tradeSide: TradeSide): Promise<number | undefined> {
    const exitSide = tradeSide === TradeSide.LONG ? 'SELL' : 'BUY';
    const orders = await ordersRepo.getOrdersByIds(orderIds);
    const exitOrders = orders.filter(order => order.side === exitSide && order.limitPrice);

    if (exitOrders.length === 0) return undefined;

    const totalQuantity = exitOrders.reduce((sum, order) => sum + order.orderQuantity, 0);
    const weightedSum = exitOrders.reduce((sum, order) =>
      sum + (order.orderQuantity * Number(order.limitPrice || 0)), 0);

    return weightedSum / totalQuantity;
  }

  /**
   * Calculate remaining quantity for open trades
   */
  private async calculateRemainingQuantity(orderIds: string[], tradeSide: TradeSide): Promise<number> {
    const orders = await ordersRepo.getOrdersByIds(orderIds);
    const entryQuantity = orders
      .filter(order => order.side === (tradeSide === TradeSide.LONG ? 'BUY' : 'SELL'))
      .reduce((sum, order) => sum + order.orderQuantity, 0);
    
    const exitQuantity = orders
      .filter(order => order.side === (tradeSide === TradeSide.LONG ? 'SELL' : 'BUY'))
      .reduce((sum, order) => sum + order.orderQuantity, 0);
    
    return entryQuantity - exitQuantity;
  }

  /**
   * Calculate open and close quantities based on trade side
   */
  private async calculateOpenCloseQuantities(
    orderIds: string[],
    tradeSide: TradeSide
  ): Promise<{openQuantity: number, closeQuantity: number}> {
    const orders = await ordersRepo.getOrdersByIds(orderIds);

    if (tradeSide === TradeSide.LONG) {
      // For LONG trades: BUY orders open, SELL orders close
      const openQuantity = orders
        .filter(order => order.side === 'BUY')
        .reduce((sum, order) => sum + order.orderQuantity, 0);

      const closeQuantity = orders
        .filter(order => order.side === 'SELL')
        .reduce((sum, order) => sum + order.orderQuantity, 0);

      return { openQuantity, closeQuantity };
    } else {
      // For SHORT trades: SELL orders open, BUY orders close
      const openQuantity = orders
        .filter(order => order.side === 'SELL')
        .reduce((sum, order) => sum + order.orderQuantity, 0);

      const closeQuantity = orders
        .filter(order => order.side === 'BUY')
        .reduce((sum, order) => sum + order.orderQuantity, 0);

      return { openQuantity, closeQuantity };
    }
  }

  /**
   * Calculate market session based on first order time
   */
  private calculateMarketSession(openTime: Date): string {
    const hour = openTime.getHours();
    const minute = openTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market hours in minutes from midnight
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    if (timeInMinutes < marketOpen) {
      return 'PRE_MARKET';
    } else if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
      return 'REGULAR';
    } else {
      return 'AFTER_HOURS';
    }
  }

  /**
   * Calculate holding period based on time between open and close
   */
  private calculateHoldingPeriod(openTime: Date, closeTime?: Date): HoldingPeriod {
    if (!closeTime) {
      return HoldingPeriod.INTRADAY; // Default for open trades
    }

    // Calculate the difference in milliseconds
    const diffMs = closeTime.getTime() - openTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If the trade is within 24 hours, it's INTRADAY
    // Otherwise it's SWING
    if (diffHours <= 24) {
      return HoldingPeriod.INTRADAY;
    } else {
      return HoldingPeriod.SWING;
    }
  }

  /**
   * Generate position key that includes brokerId
   * This ensures trades from different brokers are tracked separately
   */
  private getPositionKey(symbol: string, brokerId: string | null): string {
    return brokerId ? `${symbol}-${brokerId}` : `${symbol}-unknown`;
  }

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
    


    // Process each order in chronological order
    for (const order of orders) {
      await this.processOrder(order);
    }

    // Create trades for any remaining open positions
    await this.createTradesForOpenPositions();


    return this.newTrades;
  }

  /**
   * Update an existing trade with new orders from the current position
   */
  private async updateExistingTrade(position: OpenPosition): Promise<void> {
    if (!position.existingTradeId) {
      console.warn('[TRADE BUILDER] Cannot update trade: no existingTradeId');
      return;
    }

    // Recalculate all metrics based on updated position
    const avgEntryPrice = position.totalCostBasis / position.openQuantity;
    const avgExitPrice = await this.calculateAvgExitPrice(position.orderIds, position.side);
    const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(
      position.orderIds,
      position.side
    );
    const remainingQuantity = await this.calculateRemainingQuantity(position.orderIds, position.side);
    const totalQuantity = await this.calculateTotalQuantity(position.orderIds);
    const timeInTrade = this.calculateTimeInTrade(position.openTime);
    const marketSession = this.calculateMarketSession(position.openTime);
    const holdingPeriod = this.calculateHoldingPeriod(position.openTime, undefined);

    // Determine if trade should be OPEN or CLOSED based on remaining quantity
    const status = remainingQuantity === 0 ? TradeStatus.CLOSED : TradeStatus.OPEN;

    // Calculate P&L for closed trades
    let pnl = 0;
    if (status === TradeStatus.CLOSED && avgExitPrice) {
      pnl = position.side === TradeSide.LONG
        ? Math.round(((avgExitPrice - avgEntryPrice) * closeQuantity) * 100) / 100
        : Math.round(((avgEntryPrice - avgExitPrice) * closeQuantity) * 100) / 100;
    }

    const costBasis = avgEntryPrice * openQuantity;
    const proceeds = avgExitPrice && closeQuantity ? avgExitPrice * closeQuantity : undefined;

    // Get importBatchId from the orders in this trade
    const orders = await ordersRepo.getOrdersByIds(position.orderIds);
    const importBatchId = orders.find(o => o.importBatchId)?.importBatchId ?? undefined;

    // Update the existing trade
    await tradesRepo.updateTrade(position.existingTradeId, {
      userId: '', // Not used in updateTrade
      symbol: position.symbol,
      side: position.side,
      status,
      openTime: position.openTime,
      closeTime: status === TradeStatus.CLOSED ? new Date() : undefined,
      avgEntryPrice: new Decimal(avgEntryPrice),
      avgExitPrice: avgExitPrice ? new Decimal(avgExitPrice) : undefined,
      openQuantity,
      closeQuantity,
      pnl,
      ordersInTrade: position.orderIds,
      ordersCount: position.orderIds.length,
      executions: position.orderIds.length,
      quantity: totalQuantity,
      timeInTrade,
      remainingQuantity,
      marketSession,
      holdingPeriod,
      costBasis,
      proceeds,
      importBatchId,
    });

    // Link new orders to this trade (orders that don't have tradeId yet)
    await ordersRepo.updateOrdersWithTradeId(position.orderIds, position.existingTradeId);

    console.log(`[TRADE BUILDER] Updated existing trade ${position.existingTradeId}:`, {
      symbol: position.symbol,
      totalQuantity,
      ordersCount: position.orderIds.length,
    });
  }

  /**
   * Create trades for any remaining open positions
   */
  private async createTradesForOpenPositions(): Promise<void> {
    for (const [symbol, position] of this.openPositions.entries()) {
      // Update existing trade if this position already has a trade in the database
      if (position.existingTradeId) {
        await this.updateExistingTrade(position);
        continue;
      }

      const avgEntryPrice = position.totalCostBasis / position.openQuantity;
      const avgExitPrice = await this.calculateAvgExitPrice(position.orderIds, position.side);
      const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(
        position.orderIds,
        position.side
      );
      const remainingQuantity = await this.calculateRemainingQuantity(position.orderIds, position.side);
      
      // Determine if trade should be OPEN or CLOSED based on remaining quantity
      const status = remainingQuantity === 0 ? TradeStatus.CLOSED : TradeStatus.OPEN;
      
      // Calculate P&L for closed trades
      let pnl = 0;
      if (status === TradeStatus.CLOSED && avgExitPrice) {
        pnl = position.side === TradeSide.LONG
          ? Math.round(((avgExitPrice - avgEntryPrice) * closeQuantity) * 100) / 100
          : Math.round(((avgEntryPrice - avgExitPrice) * closeQuantity) * 100) / 100;
      }
      
      const openTrade: ProcessedTrade = {
        id: '',
        symbol: position.symbol,
        side: position.side,
        status,
        openTime: position.openTime,
        closeTime: status === TradeStatus.CLOSED ? new Date() : undefined, // Use current time if closed
        avgEntryPrice,
        avgExitPrice,
        openQuantity,
        closeQuantity,
        pnl,
        ordersInTrade: position.orderIds,
      };

      this.newTrades.push(openTrade);
    }
  }

  /**
   * Load existing open positions from the database
   */
  private async loadExistingOpenPositions(userId: string): Promise<void> {
    const openTrades = await tradesRepo.getAllOpenTrades(userId);

    for (const trade of openTrades) {
      const positionKey = this.getPositionKey(trade.symbol, trade.brokerId);
      this.openPositions.set(positionKey, {
        symbol: trade.symbol,
        side: trade.side,
        brokerId: trade.brokerId,
        openQuantity: trade.openQuantity || 0,
        totalCostBasis: Number(trade.costBasis || 0),
        openTime: trade.openTime || trade.entryDate,
        orderIds: trade.ordersInTrade,
        existingTradeId: trade.id, // Store the existing trade ID
      });
    }
  }

  /**
   * Process a single order
   */
  private async processOrder(order: Order): Promise<void> {
    if (!order.orderExecutedTime || !order.limitPrice) {
      console.warn(`Order ${order.id} missing execution time or price, skipping`);
      return;
    }

    const symbol = order.symbol;
    const orderSide = order.side;
    const quantity = order.orderQuantity;
    const price = Number(order.limitPrice);
    const orderTime = order.orderExecutedTime;
    const brokerId = order.brokerId; // Get brokerId from the order

    const tradeSide = orderSide === OrderSide.BUY ? TradeSide.LONG : TradeSide.SHORT;
    const positionKey = this.getPositionKey(symbol, brokerId);
    const existingPosition = this.openPositions.get(positionKey);

    if (!existingPosition) {
      // No existing position - open new position
      await this.openNewPosition(symbol, tradeSide, brokerId, quantity, price, orderTime, order.id);
    } else {
      // Existing position - check if same or opposite side
      if (existingPosition.side === tradeSide) {
        // Same side - add to position
        this.addToPosition(existingPosition, quantity, price, order.id);
      } else {
        // Opposite side - close or reverse position
        await this.handleOppositeOrder(existingPosition, brokerId, quantity, price, orderTime, order.id);
      }
    }
  }

  /**
   * Open a new position
   */
  private async openNewPosition(
    symbol: string,
    side: TradeSide,
    brokerId: string | null,
    quantity: number,
    price: number,
    openTime: Date,
    orderId: string
  ): Promise<void> {
    const position: OpenPosition = {
      symbol,
      side,
      brokerId,
      openQuantity: quantity,
      totalCostBasis: quantity * price,
      openTime,
      orderIds: [orderId],
      // No existingTradeId since this is a new position
    };

    const positionKey = this.getPositionKey(symbol, brokerId);
    this.openPositions.set(positionKey, position);

    // Don't create trade record yet - only when position is closed or at end of processing
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

    // No need to update trades array since we don't create trades until positions close
  }

  /**
   * Handle opposite side order (close or reverse position)
   * Updated to physically split orders when an order both closes and opens positions
   */
  private async handleOppositeOrder(
    position: OpenPosition,
    brokerId: string | null,
    quantity: number,
    price: number,
    orderTime: Date,
    orderId: string
  ): Promise<void> {
    const closingQuantity = Math.min(quantity, position.openQuantity);
    const remainingOrderQuantity = quantity - closingQuantity;
    const remainingPositionQuantity = position.openQuantity - closingQuantity;

    // Calculate average entry price
    const avgEntryPrice = position.totalCostBasis / position.openQuantity;

    // Handle order splitting if needed
    let closingOrderId = orderId;
    let newPositionOrderId: string | null = null;

    if (closingQuantity < quantity) {
      // This order needs to be split - create two separate orders
      console.log(`[TRADE BUILDER] Splitting order ${orderId}:`, {
        originalQuantity: quantity,
        closingQuantity,
        remainingQuantity: remainingOrderQuantity,
        symbol: position.symbol,
        positionSide: position.side
      });

      const [splitOrder1Id, splitOrder2Id] = await ordersRepo.splitOrder(
        orderId,
        closingQuantity,
        remainingOrderQuantity
      );

      closingOrderId = splitOrder1Id; // First part closes existing position
      newPositionOrderId = splitOrder2Id; // Second part opens new position
    }

    // Add the closing order ID to the list
    const allOrderIds = [...position.orderIds, closingOrderId];

    if (remainingPositionQuantity === 0) {
      // Position fully closed - create closed trade
      const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(
        allOrderIds,
        position.side
      );

      const avgExitPrice = await this.calculateAvgExitPrice(
        allOrderIds,
        position.side
      ) || price;

      // Calculate P&L - now simple since all orders are complete (no allocations needed)
      const pnl = position.side === TradeSide.LONG
        ? Math.round(((avgExitPrice - avgEntryPrice) * closeQuantity) * 100) / 100
        : Math.round(((avgEntryPrice - avgExitPrice) * closeQuantity) * 100) / 100;

      const closedTrade: ProcessedTrade = {
        id: '',
        symbol: position.symbol,
        side: position.side,
        status: TradeStatus.CLOSED,
        openTime: position.openTime,
        closeTime: orderTime,
        avgEntryPrice,
        avgExitPrice,
        openQuantity,
        closeQuantity,
        pnl,
        ordersInTrade: allOrderIds,
      };

      this.newTrades.push(closedTrade);
      const positionKey = this.getPositionKey(position.symbol, position.brokerId);
      this.openPositions.delete(positionKey);
    } else {
      // Position partially closed - update position but don't create trade yet
      position.openQuantity = remainingPositionQuantity;
      position.totalCostBasis = avgEntryPrice * remainingPositionQuantity;
      position.orderIds = allOrderIds;

      // The position remains open with reduced quantity
    }

    if (remainingOrderQuantity > 0) {
      // Order quantity exceeds position - reverse/create new position
      const newSide = position.side === TradeSide.LONG ? TradeSide.SHORT : TradeSide.LONG;

      // Use the split order ID if we created one
      const orderIdForNewPosition = newPositionOrderId || orderId;

      const newPosition: OpenPosition = {
        symbol: position.symbol,
        side: newSide,
        brokerId, // Use the brokerId from the incoming order
        openQuantity: remainingOrderQuantity,
        totalCostBasis: remainingOrderQuantity * price,
        openTime: orderTime,
        orderIds: [orderIdForNewPosition],
        // No existingTradeId since this is a new position from reversal
      };

      const newPositionKey = this.getPositionKey(position.symbol, brokerId);
      this.openPositions.set(newPositionKey, newPosition);
    }
  }

  /**
   * Persist trades to database and link orders
   */
  async persistTrades(userId: string): Promise<void> {
    for (const trade of this.newTrades) {
      const totalQuantity = await this.calculateTotalQuantity(trade.ordersInTrade);
      const timeInTrade = this.calculateTimeInTrade(trade.openTime, trade.closeTime);
      const remainingQuantity = trade.status === TradeStatus.OPEN
        ? await this.calculateRemainingQuantity(trade.ordersInTrade, trade.side)
        : 0;
      const marketSession = this.calculateMarketSession(trade.openTime);
      const holdingPeriod = this.calculateHoldingPeriod(trade.openTime, trade.closeTime);

      // Get importBatchId, brokerId, and assetClass from the orders in this trade
      const orders = await ordersRepo.getOrdersByIds(trade.ordersInTrade);
      const importBatchId = orders.find(o => o.importBatchId)?.importBatchId ?? undefined;
      const brokerId = orders.find(o => o.brokerId)?.brokerId ?? undefined; // Get brokerId from first order
      const assetClass = orders.find(o => o.assetClass)?.assetClass ?? undefined; // Get assetClass from first order

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
        pnl: Math.round(trade.pnl * 100) / 100,
        ordersInTrade: trade.ordersInTrade,
        ordersCount: trade.ordersInTrade.length,
        executions: trade.ordersInTrade.length,
        quantity: totalQuantity,
        timeInTrade,
        remainingQuantity,
        marketSession,
        holdingPeriod,
        costBasis: trade.avgEntryPrice && trade.openQuantity
          ? trade.avgEntryPrice * trade.openQuantity
          : undefined,
        proceeds: trade.avgExitPrice && trade.closeQuantity
          ? trade.avgExitPrice * trade.closeQuantity
          : undefined,
        importBatchId,
        brokerId, // Add brokerId to trade data
        assetClass, // Add assetClass to trade data
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