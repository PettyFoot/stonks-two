import { z } from 'zod';
import { TradeSide, AssetClass, OrderType, TimeInForce, MarketSession, HoldingPeriod, TradeStatus } from '@prisma/client';

export const tradesQuerySchema = z.object({
  symbol: z.string().optional(),
  side: z.enum(['LONG', 'SHORT', 'all']).optional(),
  dateFrom: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }).optional(),
  dateTo: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }).optional(),
  tags: z.string().optional().transform(tags => tags?.split(',')),
  duration: z.enum(['all', 'intraday', 'swing']).optional(),
  showOpenTrades: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
  sortBy: z.enum(['date', 'symbol', 'pnl', 'quantity', 'entryPrice', 'exitPrice']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const createTradeSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }).optional(),
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol too long"),
  side: z.enum(['long', 'short', 'LONG', 'SHORT']).default('long'),
  volume: z.number().int().positive().optional(),
  quantity: z.number().int().positive().optional(),
  executions: z.number().int().positive().default(1),
  pnl: z.number().default(0),
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).default([]),
  commission: z.number().optional(),
  fees: z.number().optional(),
  assetClass: z.nativeEnum(AssetClass).optional(),
  orderType: z.nativeEnum(OrderType).optional(),
  timeInForce: z.nativeEnum(TimeInForce).optional(),
  marketSession: z.nativeEnum(MarketSession).optional(),
  holdingPeriod: z.nativeEnum(HoldingPeriod).optional(),
  status: z.nativeEnum(TradeStatus).optional()
});

export const updateTradeSchema = createTradeSchema.partial();

export type TradesQuery = z.infer<typeof tradesQuerySchema>;
export type CreateTrade = z.infer<typeof createTradeSchema>;
export type UpdateTrade = z.infer<typeof updateTradeSchema>;