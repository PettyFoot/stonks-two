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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Extract filter parameters
  const symbol = searchParams.get('symbol');
  const side = searchParams.get('side');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const tags = searchParams.get('tags')?.split(',');
  const duration = searchParams.get('duration');
  const showOpenTrades = searchParams.get('showOpenTrades') === 'true';
  
  // Extract pagination parameters
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // Performance logging in development
  const startTime = process.env.NODE_ENV === 'development' ? Date.now() : 0;
  if (process.env.NODE_ENV === 'development') {
    console.log('=== OPTIMIZED TRADES API GET REQUEST ===');
    console.log('Request URL:', request.url);
    console.log('Pagination:', { page, limit, sortBy, sortOrder });
  }
  
  // Get current user (handles both demo and Auth0)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const userId = user.id;
  console.log('Using userId:', userId);

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
      console.log('Database query WHERE clause:', JSON.stringify(where, null, 2));
      console.log('Pagination params:', paginationParams);
    }
    
    // Build pagination options
    const paginationOptions = buildOffsetPaginationOptions(paginationParams);
    
    // Get total count for pagination metadata (using a more efficient count query)
    const [trades, totalCount] = await Promise.all([
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
      prisma.trade.count({ where })
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Database returned ${trades.length} trades (page ${paginationParams.page} of ${Math.ceil(totalCount / paginationParams.limit)})`);
      console.log(`Total trades matching filters: ${totalCount}`);
      const endTime = Date.now();
      console.log(`Query execution time: ${endTime - startTime}ms`);
    }

    // Transform trades to match frontend interface
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      date: trade.date.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: trade.openTime ? trade.openTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '00:00',
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

    // Calculate aggregates only for current page data (for performance)
    const pagePnl = transformedTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'number' ? trade.pnl : 0), 0);
    const pageVolume = transformedTrades.reduce((sum, trade) => sum + (trade.quantity || 0), 0);
    
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
      // Page-level aggregates (more efficient than calculating for all data)
      pagePnl,
      pageVolume,
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
      console.log(`Returning page ${paginationParams.page} with ${transformedTrades.length} items`);
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    
    const now = new Date();
    const newTrade = await prisma.trade.create({
      data: {
        userId: user.id,
        date: body.date ? new Date(body.date) : now,
        entryDate: body.date ? new Date(body.date) : now,
        symbol: body.symbol,
        side: (body.side || 'long').toUpperCase() as TradeSide,
        quantity: body.volume || 0,
        executions: body.executions || 1,
        pnl: body.pnl || 0,
        notes: body.notes,
        tags: body.tags || []
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