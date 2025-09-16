import { Order, OrderSide, TradeSide, TradeStatus, HoldingPeriod } from '@prisma/client';
import { ordersRepo } from './repositories/ordersRepo';
import { tradesRepo, CreateTradeData } from './repositories/tradesRepo';
import { Decimal } from '@prisma/client/runtime/library';

// Track partial order allocations when orders are split between trades
export interface OrderAllocation {
  orderId: string;
  quantityAllocated: number;  // How much of this order is allocated to this trade
  totalOrderQuantity: number; // The full order quantity for reference
  price: number;              // Price for this allocation
}

export interface OpenPosition {
  symbol: string;
  side: TradeSide;
  openQuantity: number;
  totalCostBasis: number;
  openTime: Date;
  orderIds: string[];
  orderAllocations?: OrderAllocation[]; // Track partial order allocations
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
  orderAllocations?: OrderAllocation[]; // Track partial order allocations
}

export class TradeBuilder {
  private openPositions: Map<string, OpenPosition> = new Map();
  private newTrades: ProcessedTrade[] = [];

  /**
   * Create an order allocation for tracking partial order usage
   */
  private createOrderAllocation(
    orderId: string,
    quantityAllocated: number,
    totalOrderQuantity: number,
    price: number
  ): OrderAllocation {
    return {
      orderId,
      quantityAllocated,
      totalOrderQuantity,
      price
    };
  }

  /**
   * Calculate total quantity from order allocations
   */
  private calculateTotalQuantityFromAllocations(allocations?: OrderAllocation[]): number {
    if (!allocations) return 0;
    return allocations.reduce((total, alloc) => total + alloc.quantityAllocated, 0);
  }

  /**
   * Calculate total quantity across all orders in a trade
   * Updated to handle order allocations for split orders
   */
  private async calculateTotalQuantity(orderIds: string[], allocations?: OrderAllocation[]): Promise<number> {
    // Get all orders in the trade
    const orders = await ordersRepo.getOrdersByIds(orderIds);
    
    // If no allocations, use standard calculation
    if (!allocations || allocations.length === 0) {
      return orders.reduce((total, order) => total + order.orderQuantity, 0);
    }
    
    // Create a map of allocated quantities by order ID
    const allocationMap = new Map<string, number>();
    for (const alloc of allocations) {
      allocationMap.set(alloc.orderId, alloc.quantityAllocated);
    }
    
    // Calculate total: use allocation if exists, otherwise use full quantity
    let totalQuantity = 0;
    for (const order of orders) {
      const allocatedQty = allocationMap.get(order.id);
      if (allocatedQty !== undefined) {
        // This order has an allocation (it's split), use allocated quantity
        totalQuantity += allocatedQty;
      } else {
        // This order is not split, use full quantity
        totalQuantity += order.orderQuantity;
      }
    }
    
    return totalQuantity;
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
   * Updated to handle order allocations for split orders
   */
  private async calculateAvgExitPrice(orderIds: string[], tradeSide: TradeSide, allocations?: OrderAllocation[]): Promise<number | undefined> {
    const exitSide = tradeSide === TradeSide.LONG ? 'SELL' : 'BUY';
    
    // If we have allocations, use those for accurate price calculation
    if (allocations && allocations.length > 0) {
      const orders = await ordersRepo.getOrdersByIds(orderIds);
      const orderMap = new Map(orders.map(o => [o.id, o]));
      
      let totalQuantity = 0;
      let weightedSum = 0;
      
      for (const alloc of allocations) {
        const order = orderMap.get(alloc.orderId);
        if (order && order.side === exitSide && order.limitPrice) {
          totalQuantity += alloc.quantityAllocated;
          weightedSum += alloc.quantityAllocated * Number(order.limitPrice);
        }
      }
      
      return totalQuantity > 0 ? weightedSum / totalQuantity : undefined;
    }
    
    // Fallback to original behavior if no allocations
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
   * Updated to handle order allocations for split orders
   */
  private async calculateOpenCloseQuantities(
    orderIds: string[], 
    tradeSide: TradeSide, 
    allocations?: OrderAllocation[]
  ): Promise<{openQuantity: number, closeQuantity: number}> {
    
    // If we have allocations, use those for accurate quantity calculation
    if (allocations && allocations.length > 0) {
      const orders = await ordersRepo.getOrdersByIds(orderIds);
      const orderMap = new Map(orders.map(o => [o.id, o]));
      
      let openQuantity = 0;
      let closeQuantity = 0;
      
      for (const alloc of allocations) {
        const order = orderMap.get(alloc.orderId);
        if (!order) continue;
        
        if (tradeSide === TradeSide.LONG) {
          if (order.side === 'BUY') {
            openQuantity += alloc.quantityAllocated;
          } else if (order.side === 'SELL') {
            closeQuantity += alloc.quantityAllocated;
          }
        } else {
          if (order.side === 'SELL') {
            openQuantity += alloc.quantityAllocated;
          } else if (order.side === 'BUY') {
            closeQuantity += alloc.quantityAllocated;
          }
        }
      }
      
      return { openQuantity, closeQuantity };
    }
    
    // Fallback to original behavior if no allocations
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
   * Create trades for any remaining open positions
   */
  private async createTradesForOpenPositions(): Promise<void> {
    for (const [symbol, position] of this.openPositions.entries()) {
      // Skip if this position already has a trade in the database
      if (position.existingTradeId) {

        continue;
      }
      
      const avgEntryPrice = position.totalCostBasis / position.openQuantity;
      const avgExitPrice = await this.calculateAvgExitPrice(position.orderIds, position.side, position.orderAllocations);
      const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(
        position.orderIds, 
        position.side,
        position.orderAllocations
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
        orderAllocations: position.orderAllocations,
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

    const tradeSide = orderSide === OrderSide.BUY ? TradeSide.LONG : TradeSide.SHORT;
    const existingPosition = this.openPositions.get(symbol);

    if (!existingPosition) {
      // No existing position - open new position
      await this.openNewPosition(symbol, tradeSide, quantity, price, orderTime, order.id);
    } else {
      // Existing position - check if same or opposite side
      if (existingPosition.side === tradeSide) {
        // Same side - add to position
        this.addToPosition(existingPosition, quantity, price, order.id);
      } else {
        // Opposite side - close or reverse position
        await this.handleOppositeOrder(existingPosition, quantity, price, orderTime, order.id);
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
    orderId: string,
    quantityAllocated?: number  // Optional: for partial order allocations
  ): Promise<void> {
    const actualQuantity = quantityAllocated || quantity;
    
    const position: OpenPosition = {
      symbol,
      side,
      openQuantity: actualQuantity,
      totalCostBasis: actualQuantity * price,
      openTime,
      orderIds: [orderId],
      orderAllocations: quantityAllocated ? [
        this.createOrderAllocation(orderId, quantityAllocated, quantity, price)
      ] : undefined,
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
    orderId: string,
    quantityAllocated?: number  // Optional: for partial order allocations
  ): void {
    const actualQuantity = quantityAllocated || quantity;
    
    // Update position
    const newTotalQuantity = position.openQuantity + actualQuantity;
    const newTotalCostBasis = position.totalCostBasis + (actualQuantity * price);
    
    position.openQuantity = newTotalQuantity;
    position.totalCostBasis = newTotalCostBasis;
    position.orderIds.push(orderId);
    
    // Add allocation if this is a partial order
    if (quantityAllocated) {
      if (!position.orderAllocations) {
        position.orderAllocations = [];
      }
      position.orderAllocations.push(
        this.createOrderAllocation(orderId, quantityAllocated, quantity, price)
      );
    }
    
    // No need to update trades array since we don't create trades until positions close
  }

  /**
   * Handle opposite side order (close or reverse position)
   * Updated to properly handle order splitting when an order both closes and opens positions
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
    
    // Create allocations for the closing portion of the order
    const closingAllocations = position.orderAllocations ? [...position.orderAllocations] : [];
    
    // If this order is being split, add only the closing portion
    if (closingQuantity < quantity) {
      // This order is split - only allocate the closing portion to this trade
      closingAllocations.push(
        this.createOrderAllocation(orderId, closingQuantity, quantity, price)
      );
    }
    
    // Add the order ID to the list
    const allOrderIds = [...position.orderIds, orderId];

    if (remainingPositionQuantity === 0) {
      // Position fully closed - create closed trade
      // If order was split, use allocations; otherwise use standard calculation
      const finalAllocations = closingQuantity < quantity ? closingAllocations : position.orderAllocations;
      
      const { openQuantity, closeQuantity } = await this.calculateOpenCloseQuantities(
        allOrderIds, 
        position.side,
        finalAllocations
      );
      
      const avgExitPrice = await this.calculateAvgExitPrice(
        allOrderIds, 
        position.side,
        finalAllocations
      ) || price;
      
      // Calculate P&L based on actual quantities used
      const actualCloseQty = finalAllocations ? 
        this.calculateTotalQuantityFromAllocations(finalAllocations.filter(a => {
          // Get only exit side allocations for P&L calculation
          return position.side === TradeSide.LONG ? 
            allOrderIds.includes(a.orderId) : 
            allOrderIds.includes(a.orderId);
        })) : closeQuantity;
      
      const pnl = position.side === TradeSide.LONG
        ? Math.round(((avgExitPrice - avgEntryPrice) * actualCloseQty) * 100) / 100
        : Math.round(((avgEntryPrice - avgExitPrice) * actualCloseQty) * 100) / 100;

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
        orderAllocations: finalAllocations,
      };

      this.newTrades.push(closedTrade);
      this.openPositions.delete(position.symbol);
    } else {
      // Position partially closed - update position but don't create trade yet
      position.openQuantity = remainingPositionQuantity;
      position.totalCostBasis = avgEntryPrice * remainingPositionQuantity;
      position.orderIds = allOrderIds;
      
      // Update allocations if this was a split order
      if (closingQuantity < quantity) {
        position.orderAllocations = closingAllocations;
      }
      
      // The position remains open with reduced quantity
    }

    if (remainingOrderQuantity > 0) {
      // Order quantity exceeds position - reverse/create new position
      const newSide = position.side === TradeSide.LONG ? TradeSide.SHORT : TradeSide.LONG;
      
      // Create allocation for the remaining portion of the split order
      const newAllocations = [
        this.createOrderAllocation(orderId, remainingOrderQuantity, quantity, price)
      ];
      
      const newPosition: OpenPosition = {
        symbol: position.symbol,
        side: newSide,
        openQuantity: remainingOrderQuantity,
        totalCostBasis: remainingOrderQuantity * price,
        openTime: orderTime,
        orderIds: [orderId],
        orderAllocations: newAllocations,
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
      // Use allocations if available for accurate quantity calculation
      const totalQuantity = await this.calculateTotalQuantity(trade.ordersInTrade, trade.orderAllocations);
      const timeInTrade = this.calculateTimeInTrade(trade.openTime, trade.closeTime);
      const remainingQuantity = trade.status === TradeStatus.OPEN 
        ? await this.calculateRemainingQuantity(trade.ordersInTrade, trade.side)
        : 0;
      const marketSession = this.calculateMarketSession(trade.openTime);
      const holdingPeriod = this.calculateHoldingPeriod(trade.openTime, trade.closeTime);

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