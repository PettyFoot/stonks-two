import { Prisma, TradeSide } from '@prisma/client';

export interface TradeFilters {
  userId: string;
  symbol?: string;
  side?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  duration?: string;
  showOpenTrades?: boolean;
}

/**
 * Centralized trade filtering service
 * Ensures consistent filter logic across all API endpoints
 */
export class TradeFilterService {
  
  /**
   * Build standardized Prisma where clause from filters
   * This ensures ALL APIs use the exact same filtering logic
   */
  static buildWhereClause(filters: TradeFilters): Prisma.TradeWhereInput {
    const where: Prisma.TradeWhereInput = {
      userId: filters.userId
    };

    // Symbol filter
    if (filters.symbol && filters.symbol !== 'Symbol' && filters.symbol !== 'all') {
      where.symbol = filters.symbol;
    }

    // Side filter  
    if (filters.side && filters.side.toLowerCase() !== 'all') {
      where.side = filters.side.toUpperCase() as TradeSide;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.date.lte = new Date(filters.dateTo);
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    // Duration filter
    if (filters.duration && filters.duration !== 'all') {
      if (filters.duration === 'intraday') {
        where.holdingPeriod = 'INTRADAY';
      } else if (filters.duration === 'swing') {
        where.holdingPeriod = 'SWING';
      }
    }

    // Trade status filter
    if (!filters.showOpenTrades) {
      where.status = 'CLOSED';
    }

    return where;
  }

  /**
   * Parse filters from request search parameters
   * Standardizes how all APIs extract filters from requests
   */
  static parseFiltersFromRequest(searchParams: URLSearchParams, userId: string): TradeFilters {
    return {
      userId,
      symbol: searchParams.get('symbol') || undefined,
      side: searchParams.get('side') || undefined,
      dateFrom: searchParams.get('dateFrom') || searchParams.get('from') || undefined,
      dateTo: searchParams.get('dateTo') || searchParams.get('to') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      duration: searchParams.get('duration') || undefined,
      showOpenTrades: searchParams.get('showOpenTrades') === 'true'
    };
  }

  /**
   * Build SQL fragments for raw queries
   * For complex queries that need raw SQL
   */
  static buildSqlFilters(filters: TradeFilters): {
    whereClause: string;
    params: Record<string, unknown>;
  } {
    const conditions: string[] = [`"userId" = $userId`];
    const params: Record<string, unknown> = { userId: filters.userId };

    if (filters.symbol && filters.symbol !== 'Symbol' && filters.symbol !== 'all') {
      conditions.push(`symbol = $symbol`);
      params.symbol = filters.symbol;
    }

    if (filters.side && filters.side.toLowerCase() !== 'all') {
      conditions.push(`side = $side`);
      params.side = filters.side.toUpperCase();
    }

    if (filters.dateFrom) {
      conditions.push(`"exitDate" >= $dateFrom`);
      params.dateFrom = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(`"exitDate" <= $dateTo`);
      params.dateTo = endDate;
    }

    // Default to closed trades unless specifically requesting open trades
    if (!filters.showOpenTrades) {
      conditions.push(`status = 'CLOSED'`);
    }

    return {
      whereClause: conditions.join(' AND '),
      params
    };
  }

  /**
   * Debug logging for filter consistency
   */
  static logFilters(context: string, filters: TradeFilters): void {
    console.log(`\n=== ${context.toUpperCase()} FILTERS ===`);
    console.log('UserId:', filters.userId);
    console.log('Symbol:', filters.symbol || 'all');
    console.log('Side:', filters.side || 'all');
    console.log('Date From:', filters.dateFrom || 'none');
    console.log('Date To:', filters.dateTo || 'none');
    console.log('Tags:', filters.tags || 'none');
    console.log('Duration:', filters.duration || 'all');
    console.log('Show Open Trades:', filters.showOpenTrades || false);
    console.log(`=====================================\n`);
  }
}