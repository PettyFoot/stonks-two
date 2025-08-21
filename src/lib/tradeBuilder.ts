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
   * Calculate average exit price for open trades
   */
  private async calculateAvgExitPrice(orderIds: string[], tradeSide: TradeSide): Promise<number | undefined> {
    const orders = await ordersRepo.getOrdersByIds(orderIds);
    const exitSide = tradeSide === TradeSide.LONG ? 'SELL' : 'BUY';
    const exitOrders = orders.filter(order => order.side === exitSide && order.limitPrice);
    
    if (exitOrders.length === 0) return undefined;
    
    const totalQuantity = exitOrders.reduce((sum, order) => sum + order.orderQuantity, 0);
    const weightedSum = exitOrders.reduce((sum, order) => 
      sum + (order.orderQuantity * order.limitPrice!), 0);
    
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
  private async calculateOpenCloseQuantities(orderIds: string[], tradeSide: TradeSide): Promise<{openQuantity: number, closeQuantity: number}> {
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

    // Create trades for any remaining open positions
    await this.createTradesForOpenPositions();

    console.log(`Created ${this.newTrades.length} new trades`);
    return this.newTrades;
  }

  /**
   * Create trades for any remaining open positions
   */
  private async createTradesForOpenPositions(): Promise<void> {
    for (const [symbol, position] of this.openPositions.entries()) {
      // Skip if this position already has a trade in the database
      if (position.existingTradeId) {
        console.log(`Skipping existing open trade for ${symbol} (ID: ${position.existingTradeId})`);
        continue;
      }
      
      const avgEntryPrice = position.totalCostBasis / position.openQuantity;
      const avgExitPrice = await this.calculateAvgExitPrice(position.orderIds, position.side);
      const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(position.orderIds, position.side);
      const _remainingQuantity = await this.calculateRemainingQuantity(position.orderIds, position.side);
      
      const openTrade: ProcessedTrade = {
        id: '',
        symbol: position.symbol,
        side: position.side,
        status: TradeStatus.OPEN,
        openTime: position.openTime,
        avgEntryPrice,
        avgExitPrice,
        openQuantity,
        closeQuantity,
        pnl: 0, // No P&L for open positions
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
      const positionKey = trade.symbol;
      this.openPositions.set(positionKey, {
        symbol: trade.symbol,
        side: trade.side,
        openQuantity: trade.openQuantity || 0,
        totalCostBasis: trade.costBasis || 0,
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
      // No existingTradeId since this is a new position
    };

    this.openPositions.set(symbol, position);
    
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
   */
  private async handleOppositeOrder(
    position: OpenPosition,
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
    
    // Add the closing order to the position's order list
    const allOrderIds = [...position.orderIds, orderId];

    if (remainingPositionQuantity === 0) {
      // Position fully closed - create closed trade
      const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(allOrderIds, position.side);
      const pnl = position.side === TradeSide.LONG
        ? Math.round(((price - avgEntryPrice) * closingQuantity) * 100) / 100
        : Math.round(((avgEntryPrice - price) * closingQuantity) * 100) / 100;

      const closedTrade: ProcessedTrade = {
        id: '',
        symbol: position.symbol,
        side: position.side,
        status: TradeStatus.CLOSED,
        openTime: position.openTime,
        closeTime: orderTime,
        avgEntryPrice,
        avgExitPrice: price,
        openQuantity,
        closeQuantity,
        pnl,
        ordersInTrade: allOrderIds,
      };

      this.newTrades.push(closedTrade);
      this.openPositions.delete(position.symbol);
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
      
      const newPosition: OpenPosition = {
        symbol: position.symbol,
        side: newSide,
        openQuantity: remainingOrderQuantity,
        totalCostBasis: remainingOrderQuantity * price,
        openTime: orderTime,
        orderIds: [orderId],
        // No existingTradeId since this is a new position from reversal
      };

      this.openPositions.set(position.symbol, newPosition);
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