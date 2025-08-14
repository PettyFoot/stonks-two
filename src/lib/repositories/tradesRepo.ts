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
  quantity?: number;
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
        pnl: tradeData.pnl,
        profitLoss: tradeData.pnl,
        ordersInTrade: tradeData.ordersInTrade,
        ordersCount: tradeData.ordersCount,
        quantity: tradeData.quantity || tradeData.openQuantity,
        quantityFilled: tradeData.quantity || tradeData.openQuantity || 0,
        volume: tradeData.quantity || tradeData.openQuantity || 0,
        costBasis: tradeData.costBasis,
        proceeds: tradeData.proceeds,
        orderFilledTime: tradeData.openTime,
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
        profitLoss: updateData.pnl,
        quantity: updateData.quantity || updateData.openQuantity,
        quantityFilled: updateData.quantity || updateData.openQuantity || 0,
        volume: updateData.quantity || updateData.openQuantity || 0,
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