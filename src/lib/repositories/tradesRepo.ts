import { prisma } from '@/lib/prisma';
import { Trade, TradeStatus, TradeSide, MarketSession, HoldingPeriod, AssetClass } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateTradeData {
  userId: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  openTime: Date;
  closeTime?: Date;
  avgEntryPrice?: Decimal;
  avgExitPrice?: Decimal;
  openQuantity?: number;
  closeQuantity?: number;
  pnl: number;
  ordersInTrade: string[];
  ordersCount: number;
  executions: number;
  quantity: number;
  timeInTrade: number;
  remainingQuantity?: number;
  marketSession: string;
  holdingPeriod?: HoldingPeriod;
  costBasis?: number;
  proceeds?: number;
  importBatchId?: string;
  brokerId?: string; // Reference to Broker.id - tracks which broker this trade came from
  assetClass?: AssetClass; // Asset class from orders
}

export class TradesRepository {
  /**
   * Save a new trade to the database
   */
  async saveTrade(tradeData: CreateTradeData): Promise<Trade> {
    return await prisma.trade.create({
      data: {
        userId: tradeData.userId,
        symbol: tradeData.symbol,
        side: tradeData.side,
        status: tradeData.status,
        openTime: tradeData.openTime,
        closeTime: tradeData.closeTime,
        avgEntryPrice: tradeData.avgEntryPrice,
        avgExitPrice: tradeData.avgExitPrice,
        openQuantity: tradeData.openQuantity,
        closeQuantity: tradeData.closeQuantity,
        pnl: new Decimal(tradeData.pnl),
        ordersInTrade: tradeData.ordersInTrade,
        ordersCount: tradeData.ordersCount,
        executions: tradeData.executions,
        quantity: tradeData.quantity,
        timeInTrade: tradeData.timeInTrade,
        remainingQuantity: tradeData.remainingQuantity,
        marketSession: tradeData.marketSession as MarketSession | undefined,
        holdingPeriod: tradeData.holdingPeriod,
        costBasis: tradeData.costBasis ? new Decimal(tradeData.costBasis) : undefined,
        proceeds: tradeData.proceeds ? new Decimal(tradeData.proceeds) : undefined,
        entryDate: tradeData.openTime,
        exitDate: tradeData.closeTime,
        date: tradeData.closeTime || tradeData.openTime,
        entryPrice: tradeData.avgEntryPrice?.toNumber(),
        exitPrice: tradeData.avgExitPrice?.toNumber(),
        isCalculated: true,
        importBatchId: tradeData.importBatchId,
        brokerId: tradeData.brokerId, // Save brokerId to trades table
        assetClass: tradeData.assetClass, // Save assetClass to trades table
      },
    });
  }

  /**
   * Get open trades for a user and symbol
   */
  async getOpenTrades(userId: string, symbol: string): Promise<Trade[]> {
    return await prisma.trade.findMany({
      where: {
        userId,
        symbol,
        status: TradeStatus.OPEN,
        isCalculated: true,
      },
      orderBy: {
        openTime: 'asc',
      },
    });
  }

  /**
   * Get all open trades for a user (across all symbols)
   */
  async getAllOpenTrades(userId: string): Promise<Trade[]> {
    return await prisma.trade.findMany({
      where: {
        userId,
        status: TradeStatus.OPEN,
        isCalculated: true,
      },
      orderBy: {
        openTime: 'asc',
      },
    });
  }

  /**
   * Update an existing trade
   */
  async updateTrade(tradeId: string, updateData: Partial<CreateTradeData>): Promise<Trade> {
    const { userId: _userId, marketSession, ...updateFields } = updateData;
    return await prisma.trade.update({
      where: { id: tradeId },
      data: {
        ...updateFields,
        marketSession: marketSession as MarketSession | undefined,
        pnl: updateData.pnl ? new Decimal(updateData.pnl) : undefined,
        entryPrice: updateData.avgEntryPrice?.toNumber(),
        exitPrice: updateData.avgExitPrice?.toNumber(),
        exitDate: updateData.closeTime,
        date: updateData.closeTime || updateData.openTime,
        brokerId: updateData.brokerId, // Allow brokerId updates
        assetClass: updateData.assetClass, // Allow assetClass updates
      },
    });
  }

  /**
   * Get completed trades for a user
   */
  async getCompletedTrades(userId: string): Promise<Trade[]> {
    return await prisma.trade.findMany({
      where: {
        userId,
        status: TradeStatus.CLOSED,
        isCalculated: true,
      },
      orderBy: {
        closeTime: 'desc',
      },
    });
  }

  /**
   * Get all calculated trades for a user
   */
  async getAllCalculatedTrades(userId: string): Promise<Trade[]> {
    return await prisma.trade.findMany({
      where: {
        userId,
        isCalculated: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Get trades for a specific date for records purposes
   * Includes both calculated trades and blank records entries
   */
  async getTradesForRecordsDate(userId: string, date: Date): Promise<Trade[]> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return await prisma.trade.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: [
        { status: 'asc' }, // BLANK trades first, then others
        { date: 'asc' }
      ]
    });
  }

  /**
   * Get a specific trade by ID
   */
  async getTradeById(userId: string, tradeId: string): Promise<Trade | null> {
    return await prisma.trade.findFirst({
      where: {
        id: tradeId,
        userId
      }
    });
  }

  /**
   * Get trade with associated orders for records display
   * Uses Order.tradeId as primary relationship (as per schema comment line 86)
   */
  async getTradeWithOrders(userId: string, tradeId: string) {
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        userId
      }
    });

    if (!trade) {
      return null;
    }

    // Get associated orders using the ordersInTrade array (direct order IDs)
    const orders = trade.ordersInTrade && trade.ordersInTrade.length > 0
      ? await prisma.order.findMany({
          where: {
            id: { in: trade.ordersInTrade }
          },
          orderBy: {
            orderExecutedTime: 'asc'
          }
        })
      : [];

    // Enhanced data consistency logging for trade-order relationship integrity
    const ordersInTradeCount = trade.ordersInTrade ? trade.ordersInTrade.length : 0;
    const foundOrdersCount = orders.length;
    
    if (ordersInTradeCount !== foundOrdersCount) {
      console.warn(`[TRADES REPO] Order fetching issue detected for trade ${trade.id}:`, {
        tradeId: trade.id,
        symbol: trade.symbol,
        date: trade.date?.toISOString(),
        status: trade.status,
        ordersInTradeArray: trade.ordersInTrade || [],
        ordersInTradeCount,
        foundOrdersCount,
        foundOrderIds: orders.map(o => o.id),
        missingOrderIds: (trade.ordersInTrade || []).filter(id => !orders.some(o => o.id === id)),
        issueType: ordersInTradeCount > foundOrdersCount ? 'ORDERS_NOT_FOUND_IN_DB' : 'UNEXPECTED_EXTRA_ORDERS',
        recommendation: 'Check if order IDs in ordersInTrade array exist in orders table'
      });
    }

    return {
      trade,
      orders
    };
  }

  /**
   * Get records summary for a date range
   */
  async getRecordsSummary(userId: string, startDate: Date, endDate: Date) {
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: {
          not: 'BLANK' // Don't include blank entries in summary calculations
        }
      }
    });

    const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl.toNumber(), 0);
    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
    const winningTrades = trades.filter(trade => trade.pnl.toNumber() > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalPnl,
      totalTrades,
      totalVolume,
      winRate,
      trades
    };
  }

  /**
   * Validate if trades can be deleted (check for shared orders)
   * Returns validation result with details about conflicts
   */
  async validateDeletion(userId: string, tradeIds: string[]) {
    // Get all trades to be deleted
    const tradesToDelete = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
        userId,
      },
      select: {
        id: true,
        symbol: true,
        ordersInTrade: true,
      },
    });

    if (tradesToDelete.length === 0) {
      return {
        canDelete: false,
        error: 'No trades found to delete',
      };
    }

    // Get all unique order IDs from trades to be deleted
    const orderIds = Array.from(
      new Set(
        tradesToDelete.flatMap(trade => trade.ordersInTrade || [])
      )
    );

    if (orderIds.length === 0) {
      // No orders to worry about, can delete
      return {
        canDelete: true,
        tradeCount: tradesToDelete.length,
        orderCount: 0,
      };
    }

    // Check if any of these orders are used by OTHER trades (not in deletion list)
    const tradesUsingOrders = await prisma.trade.findMany({
      where: {
        userId,
        id: { notIn: tradeIds },
        ordersInTrade: {
          hasSome: orderIds,
        },
      },
      select: {
        id: true,
        symbol: true,
        date: true,
        ordersInTrade: true,
      },
    });

    if (tradesUsingOrders.length > 0) {
      // Find which specific orders are shared
      const sharedOrders = orderIds.filter(orderId =>
        tradesUsingOrders.some(trade => trade.ordersInTrade.includes(orderId))
      );

      // Build detailed conflict information
      const conflictDetails = sharedOrders.map(orderId => {
        const tradesWithThisOrder = tradesUsingOrders.filter(t =>
          t.ordersInTrade.includes(orderId)
        );
        return {
          orderId,
          affectedTradeIds: tradesWithThisOrder.map(t => t.id),
          affectedTradeInfo: tradesWithThisOrder.map(t => ({
            id: t.id,
            symbol: t.symbol,
            date: t.date,
          })),
        };
      });

      // Get unique list of all affected trade IDs
      const allAffectedTradeIds = Array.from(
        new Set(tradesUsingOrders.map(t => t.id))
      );

      return {
        canDelete: false,
        error: 'Some orders are shared with other trades',
        sharedOrderCount: sharedOrders.length,
        affectedTrades: tradesUsingOrders.map(t => ({
          id: t.id,
          symbol: t.symbol,
          date: t.date,
        })),
        // Enhanced debug information
        conflictDetails,
        allAffectedTradeIds,
        totalConflictingTrades: tradesUsingOrders.length,
        selectedTradeIds: tradeIds,
        sharedOrderIds: sharedOrders,
      };
    }

    // All validations passed
    return {
      canDelete: true,
      tradeCount: tradesToDelete.length,
      orderCount: orderIds.length,
    };
  }

  /**
   * Delete trades and their associated orders
   * Must call validateDeletion first to ensure it's safe
   */
  async deleteTrades(userId: string, tradeIds: string[]) {
    return await prisma.$transaction(async (tx) => {
      // Get all trades to delete (with their orders)
      const trades = await tx.trade.findMany({
        where: {
          id: { in: tradeIds },
          userId,
        },
        select: {
          id: true,
          ordersInTrade: true,
        },
      });

      // Collect all order IDs
      const orderIds = Array.from(
        new Set(
          trades.flatMap(trade => trade.ordersInTrade || [])
        )
      );

      // Delete the trades first
      const tradesDeleted = await tx.trade.deleteMany({
        where: {
          id: { in: tradeIds },
          userId,
        },
      });

      // Delete the associated orders
      let ordersDeleted = 0;
      if (orderIds.length > 0) {
        const ordersResult = await tx.order.deleteMany({
          where: {
            id: { in: orderIds },
          },
        });
        ordersDeleted = ordersResult.count;
      }

      return {
        tradesDeleted: tradesDeleted.count,
        ordersDeleted,
      };
    });
  }
}

export const tradesRepo = new TradesRepository();