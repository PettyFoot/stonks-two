import { NextResponse } from 'next/server';
import { TradeSide, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import {
  normalizePaginationParams,
  buildOffsetPaginationOptions,
  createPaginatedResponse,
  generateCursor
} from '@/lib/utils/pagination';
import { tradesQuerySchema, createTradeSchema } from '@/lib/schemas/trades';
import { ERROR_MESSAGES, HTTP_STATUS, DEFAULTS, DATE_FORMATS } from '@/constants/app';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Validate query parameters using Zod
  const queryParams = {
    symbol: searchParams.get('symbol') || undefined,
    side: searchParams.get('side') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    tags: searchParams.get('tags') || undefined,
    duration: searchParams.get('duration') || undefined,
    showOpenTrades: searchParams.get('showOpenTrades') === 'true',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '50', 10),
    sortBy: searchParams.get('sortBy') || 'date',
    sortOrder: searchParams.get('sortOrder') || 'desc'
  };

  const validationResult = tradesQuerySchema.safeParse(queryParams);
  if (!validationResult.success) {
    return NextResponse.json({
      error: ERROR_MESSAGES.INVALID_QUERY_PARAMETERS,
      details: validationResult.error.issues
    }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const { symbol, side, dateFrom, dateTo, tags, duration, showOpenTrades, page, limit, sortBy, sortOrder } = validationResult.data;
  
  // Performance logging in development
  const startTime = process.env.NODE_ENV === 'development' ? Date.now() : 0;
  if (process.env.NODE_ENV === 'development') {



  }
  
  // Get current user (handles both demo and Auth0)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED }, { status: HTTP_STATUS.UNAUTHORIZED });
  }
  
  const userId = user.id;


  // Simple validation: ensure we have a valid user
  if (!userId) {
    console.error('No userId found');
    return NextResponse.json({ error: ERROR_MESSAGES.INVALID_USER_STATE }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  // Build where clause for filters
  try {
    const where: Prisma.TradeWhereInput = {
      userId: userId
    };

    if (symbol && symbol !== 'Symbol') {
      where.symbol = symbol;
    }

    if (side && side.toLowerCase() !== 'all') {
      where.side = side.toUpperCase() as TradeSide;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags
      };
    }

    // Duration filter
    if (duration && duration !== 'all') {
      if (duration === 'intraday') {
        where.holdingPeriod = 'INTRADAY';
      } else if (duration === 'swing') {
        where.holdingPeriod = 'SWING';
      }
    }

    // Open trades filter - by default hide open trades unless checkbox is checked
    if (!showOpenTrades) {
      where.status = 'CLOSED';
    }

    // Normalize pagination parameters
    const paginationParams = normalizePaginationParams({ 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    });
    
    if (process.env.NODE_ENV === 'development') {


    }
    
    // Build pagination options
    const paginationOptions = buildOffsetPaginationOptions(paginationParams);
    
    // Get total count and aggregates for pagination metadata (using efficient queries)
    const [trades, totalCount, aggregateResult] = await Promise.all([
      // Get paginated trades with optimized field selection
      prisma.trade.findMany({
        where,
        select: {
          id: true,
          date: true,
          openTime: true,
          symbol: true,
          side: true,
          quantity: true,
          executions: true,
          pnl: true,
          entryPrice: true,
          exitPrice: true,
          holdingPeriod: true,
          status: true,
          notes: true,
          tags: true,
          commission: true,
          fees: true,
          marketSession: true,
          orderType: true
        },
        orderBy: {
          [paginationParams.sortBy]: paginationParams.sortOrder
        },
        skip: paginationOptions.skip,
        take: paginationOptions.take
      }),
      // Efficient count query
      prisma.trade.count({ where }),
      // Aggregate query for totals across all filtered trades
      prisma.trade.aggregate({
        where,
        _sum: {
          pnl: true,
          quantity: true
        }
      })
    ]);

    if (process.env.NODE_ENV === 'development') {


      const endTime = Date.now();

    }

    // Transform trades to match frontend interface
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      date: trade.date.toLocaleDateString('en-US', DATE_FORMATS.DISPLAY_DATE),
      time: trade.openTime ? trade.openTime.toLocaleTimeString('en-US', DATE_FORMATS.TIME_FORMAT) : DEFAULTS.TIME_DISPLAY,
      symbol: trade.symbol,
      side: trade.side.toLowerCase() as 'long' | 'short',
      quantity: trade.quantity,
      executions: trade.executions,
      pnl: typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl,
      entryPrice: trade.entryPrice ? (typeof trade.entryPrice === 'object' ? trade.entryPrice.toNumber() : trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? (typeof trade.exitPrice === 'object' ? trade.exitPrice.toNumber() : trade.exitPrice) : undefined,
      holdingPeriod: trade.holdingPeriod || undefined,
      status: trade.status || undefined,
      shared: false,
      notes: trade.notes,
      tags: trade.tags,
      commission: trade.commission ? (typeof trade.commission === 'object' ? trade.commission.toNumber() : trade.commission) : undefined,
      fees: trade.fees ? (typeof trade.fees === 'object' ? trade.fees.toNumber() : trade.fees) : undefined,
      marketSession: trade.marketSession || undefined,
      orderType: trade.orderType || undefined
    }));

    // Calculate totals from database aggregates
    const totalPnl = aggregateResult._sum.pnl ? Number(aggregateResult._sum.pnl) : 0;
    const totalVolume = aggregateResult._sum.quantity || 0;
    
    // Create paginated response
    const paginatedResponse = createPaginatedResponse(
      transformedTrades,
      paginationParams,
      totalCount,
      (trade) => generateCursor(new Date(trade.date), trade.id)
    );

    const responseData = {
      ...paginatedResponse,
      // Legacy compatibility fields
      trades: paginatedResponse.data,
      count: paginatedResponse.data.length,
      totalCount,
      // Total aggregates across all filtered trades
      totalPnl,
      totalVolume,
      // Performance metrics
      ...(process.env.NODE_ENV === 'development' && {
        performance: {
          queryTime: Date.now() - startTime,
          itemsPerPage: paginationParams.limit,
          currentPage: paginationParams.page,
          totalPages: Math.ceil(totalCount / paginationParams.limit)
        }
      })
    };
    
    if (process.env.NODE_ENV === 'development') {

    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Optimized Trades API error:', error);
    
    // Log performance metrics even on error
    if (process.env.NODE_ENV === 'development' && startTime) {
      console.error(`Request failed after ${Date.now() - startTime}ms`);
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch trades',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    const body = await request.json();

    // Validate request body using Zod
    const validationResult = createTradeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: ERROR_MESSAGES.INVALID_TRADE_DATA,
        details: validationResult.error.issues
      }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const validatedData = validationResult.data;
    
    const now = new Date();
    const newTrade = await prisma.trade.create({
      data: {
        userId: user.id,
        date: validatedData.date ? new Date(validatedData.date) : now,
        entryDate: validatedData.date ? new Date(validatedData.date) : now,
        symbol: validatedData.symbol,
        side: validatedData.side.toUpperCase() as TradeSide,
        quantity: validatedData.volume || validatedData.quantity || 0,
        executions: validatedData.executions,
        pnl: validatedData.pnl,
        entryPrice: validatedData.entryPrice,
        exitPrice: validatedData.exitPrice,
        notes: validatedData.notes,
        tags: validatedData.tags,
        commission: validatedData.commission,
        fees: validatedData.fees,
        assetClass: validatedData.assetClass,
        orderType: validatedData.orderType,
        timeInForce: validatedData.timeInForce,
        marketSession: validatedData.marketSession,
        holdingPeriod: validatedData.holdingPeriod,
        status: validatedData.status
      }
    });

    // Transform response to match frontend interface
    const transformedTrade = {
      id: newTrade.id,
      date: newTrade.date.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: newTrade.openTime ? newTrade.openTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '00:00',
      symbol: newTrade.symbol,
      side: newTrade.side.toLowerCase() as 'long' | 'short',
      volume: newTrade.quantity,
      executions: newTrade.executions,
      pnl: typeof newTrade.pnl === 'object' ? newTrade.pnl.toNumber() : newTrade.pnl,
      shared: false,
      notes: newTrade.notes,
      tags: newTrade.tags
    };
    
    return NextResponse.json(transformedTrade, { status: 201 });
  } catch (error) {
    console.error('Create trade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}