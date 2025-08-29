import { NextResponse } from 'next/server';
import { mockTrades } from '@/data/mockData';
import { TradeSide, Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const symbol = searchParams.get('symbol');
  const side = searchParams.get('side');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const tags = searchParams.get('tags')?.split(',');
  const duration = searchParams.get('duration');
  const showOpenTrades = searchParams.get('showOpenTrades') === 'true';
  const demo = searchParams.get('demo') === 'true';
  
  let userId: string;
  
  if (demo) {
    userId = getDemoUserId();
  } else {
    // Authenticated mode - get user-specific data
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    userId = user.id;
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

    // Get only trades from trades table (not individual orders)
    const trades = await prisma.trade.findMany({
      where,
      orderBy: [
        { date: 'desc' }
      ]
    });

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

    return NextResponse.json({
      trades: transformedTrades,
      count: transformedTrades.length,
      totalPnl: transformedTrades.reduce((sum, trade) => sum + (typeof trade.pnl === 'number' ? trade.pnl : 0), 0),
      totalVolume: transformedTrades.reduce((sum, trade) => sum + (trade.quantity || 0), 0)
    });
  } catch (error) {
    console.error('Trades API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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