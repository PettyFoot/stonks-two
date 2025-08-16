import { prisma } from '@/lib/prisma';
import { Trade, TradeStatus, TradeSide } from '@prisma/client';
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
        marketSession: tradeData.marketSession as any,
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
    return await prisma.trade.update({
      where: { id: tradeId },
      data: {
        ...updateData,
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
}

export const tradesRepo = new TradesRepository();