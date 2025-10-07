import { prisma } from '@/lib/prisma';
import { Order, Trade, OrderSide, TradeSide, OrderStatus } from '@prisma/client';

interface OpenPosition {
  symbol: string;
  side: TradeSide;
  remainingQuantity: number;
  orders: string[];
  costBasis: number;
  openTime: Date;
  totalQuantity: number;
}

interface CalculatedTrade {
  symbol: string;
  side: TradeSide;
  openTime: Date;
  closeTime: Date;
  quantity: number;
  costBasis: number;
  proceeds: number;
  profitLoss: number;
  ordersInTrade: string[];
  ordersCount: number;
}

export class TradeCalculationService {
  private openPositions: Map<string, OpenPosition> = new Map();
  private completedTrades: CalculatedTrade[] = [];

  /**
   * Main function to build trades from orders
   * @param userId - User ID to process trades for
   * @returns Array of calculated trades
   */
  async buildTrades(userId: string): Promise<CalculatedTrade[]> {
    // Reset state
    this.openPositions.clear();
    this.completedTrades = [];

    // Load existing open positions from calculated trades
    await this.loadOpenPositions(userId);

    // Fetch all valid orders
    const orders = await this.fetchValidOrders(userId);

    // Process each order in chronological order
    for (const order of orders) {
      await this.processOrder(order);
    }

    // Store calculated trades in database
    await this.storeTrades(userId);

    return this.completedTrades;
  }

  /**
   * Load existing open positions from calculated trades
   */
  private async loadOpenPositions(userId: string): Promise<void> {
    // Find calculated trades that might still have open positions
    const openTrades = await prisma.trade.findMany({
      where: {
        userId,
        isCalculated: true,
        closeTime: null, // Still open
      },
    });

    // Reconstruct open positions from these trades
    for (const trade of openTrades) {
      this.openPositions.set(trade.symbol, {
        symbol: trade.symbol,
        side: trade.side,
        remainingQuantity: trade.quantity || 0,
        orders: trade.ordersInTrade,
        costBasis: Number(trade.costBasis || 0),
        openTime: trade.openTime || trade.entryDate,
        totalQuantity: trade.quantity || 0,
      });
    }
  }

  /**
   * Fetch valid orders (not cancelled, executed, not used in trades yet)
   */
  private async fetchValidOrders(userId: string): Promise<Order[]> {
    return await prisma.order.findMany({
      where: {
        userId,
        orderExecutedTime: { not: null },
        orderCancelledTime: null,
        orderStatus: OrderStatus.FILLED,
        usedInTrade: false, // Only get orders not yet used in trades
      },
      orderBy: {
        orderExecutedTime: 'asc',
      },
    });
  }

  /**
   * Process a single order
   */
  private async processOrder(order: Order): Promise<void> {
    const symbol = order.symbol;
    const orderSide = order.side;
    const tradeSide = orderSide === OrderSide.BUY ? TradeSide.LONG : TradeSide.SHORT;
    const quantity = order.orderQuantity;
    const price = order.limitPrice ? Number(order.limitPrice) : 0;

    const openPosition = this.openPositions.get(symbol);

    if (!openPosition) {
      // No open position - create new one
      this.openNewPosition(symbol, tradeSide, quantity, price, order);
    } else {
      // Existing position
      if (this.isSameSide(openPosition.side, orderSide)) {
        // Same side - add to position
        this.addToPosition(openPosition, quantity, price, order);
      } else {
        // Opposite side - close or reverse position
        this.handleOppositeOrder(openPosition, quantity, price, order);
      }
    }
  }

  /**
   * Check if order side matches position side
   */
  private isSameSide(positionSide: TradeSide, orderSide: OrderSide): boolean {
    return (positionSide === TradeSide.LONG && orderSide === OrderSide.BUY) ||
           (positionSide === TradeSide.SHORT && orderSide === OrderSide.SELL);
  }

  /**
   * Open a new position
   */
  private openNewPosition(
    symbol: string,
    side: TradeSide,
    quantity: number,
    price: number,
    order: Order
  ): void {
    const position: OpenPosition = {
      symbol,
      side,
      remainingQuantity: quantity,
      orders: [order.orderId],
      costBasis: quantity * price,
      openTime: order.orderExecutedTime!,
      totalQuantity: quantity,
    };

    this.openPositions.set(symbol, position);
  }

  /**
   * Add to existing position (same side)
   */
  private addToPosition(
    position: OpenPosition,
    quantity: number,
    price: number,
    order: Order
  ): void {
    position.remainingQuantity += quantity;
    position.totalQuantity += quantity;
    position.costBasis += quantity * price;
    position.orders.push(order.orderId);
  }

  /**
   * Handle opposite side order (close or reverse)
   */
  private handleOppositeOrder(
    position: OpenPosition,
    quantity: number,
    price: number,
    order: Order
  ): void {
    const closingQuantity = Math.min(quantity, position.remainingQuantity);
    
    // Calculate proceeds for closing portion
    const proceeds = closingQuantity * price;
    
    // Calculate cost basis for closed portion
    const closedCostBasis = (position.costBasis / position.totalQuantity) * closingQuantity;
    
    // Create completed trade
    const completedTrade: CalculatedTrade = {
      symbol: position.symbol,
      side: position.side,
      openTime: position.openTime,
      closeTime: order.orderExecutedTime!,
      quantity: closingQuantity,
      costBasis: closedCostBasis,
      proceeds,
      profitLoss: position.side === TradeSide.LONG 
        ? proceeds - closedCostBasis 
        : closedCostBasis - proceeds,
      ordersInTrade: [...position.orders, order.orderId],
      ordersCount: position.orders.length + 1,
    };

    this.completedTrades.push(completedTrade);

    // Update or remove position
    if (quantity > position.remainingQuantity) {
      // Reverse position - open new position in opposite direction
      const newSide = position.side === TradeSide.LONG ? TradeSide.SHORT : TradeSide.LONG;
      const remainingQuantity = quantity - position.remainingQuantity;
      
      this.openPositions.set(position.symbol, {
        symbol: position.symbol,
        side: newSide,
        remainingQuantity,
        orders: [order.orderId],
        costBasis: remainingQuantity * price,
        openTime: order.orderExecutedTime!,
        totalQuantity: remainingQuantity,
      });
    } else if (quantity === position.remainingQuantity) {
      // Exact close - remove position
      this.openPositions.delete(position.symbol);
    } else {
      // Partial close - update position
      position.remainingQuantity -= closingQuantity;
      position.costBasis -= closedCostBasis;
    }
  }

  /**
   * Store calculated trades in database
   */
  private async storeTrades(userId: string): Promise<void> {
    // Create new calculated trades and mark orders as used
    for (const trade of this.completedTrades) {
      // Get importBatchId from the orders in this trade
      const orders = await prisma.order.findMany({
        where: {
          orderId: { in: trade.ordersInTrade },
          userId,
        },
        select: {
          importBatchId: true,
        },
      });

      // Use the first non-null importBatchId found (all orders in a trade should have the same batch)
      const importBatchId = orders.find(o => o.importBatchId)?.importBatchId ?? undefined;

      const createdTrade = await prisma.trade.create({
        data: {
          userId,
          symbol: trade.symbol,
          side: trade.side,
          openTime: trade.openTime,
          closeTime: trade.closeTime,
          quantity: trade.quantity,
          costBasis: trade.costBasis,
          proceeds: trade.proceeds,
          pnl: trade.profitLoss,
          ordersInTrade: trade.ordersInTrade,
          ordersCount: trade.ordersCount,
          isCalculated: true,
          entryDate: trade.openTime,
          exitDate: trade.closeTime,
          date: trade.closeTime,
          entryPrice: trade.costBasis / trade.quantity,
          exitPrice: trade.proceeds / trade.quantity,
          importBatchId,
        },
      });

      // Mark all orders in this trade as used
      await prisma.order.updateMany({
        where: {
          orderId: { in: trade.ordersInTrade },
          userId,
        },
        data: {
          usedInTrade: true,
          tradeId: createdTrade.id,
        },
      });
    }
  }

  /**
   * Recalculate trades for a specific import batch
   */
  async recalculateForImportBatch(userId: string, _importBatchId: string): Promise<CalculatedTrade[]> {
    // You can filter orders by import batch if needed
    return this.buildTrades(userId);
  }

  /**
   * Get calculated trades for display
   */
  async getCalculatedTrades(userId: string): Promise<Trade[]> {
    return await prisma.trade.findMany({
      where: {
        userId,
        isCalculated: true,
      },
      orderBy: {
        closeTime: 'desc',
      },
    });
  }
}

// Export singleton instance
export const tradeCalculationService = new TradeCalculationService();