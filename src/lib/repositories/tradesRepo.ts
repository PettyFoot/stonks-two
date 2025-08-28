import { prisma } from '@/lib/prisma';
import { Trade, TradeStatus, TradeSide, MarketSession, HoldingPeriod } from '@prisma/client';
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
}

export const tradesRepo = new TradesRepository();