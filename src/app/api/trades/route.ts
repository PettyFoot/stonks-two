import { NextResponse } from 'next/server';
import { mockTrades } from '@/data/mockData';
import { TradeSide, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const symbol = searchParams.get('symbol');
  const side = searchParams.get('side');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const tags = searchParams.get('tags')?.split(',');
  const demo = searchParams.get('demo') === 'true';
  
  // Demo mode - return filtered mock data
  if (demo) {
    let filteredTrades = mockTrades;
    
    // Apply filters
    if (symbol && symbol !== 'Symbol') {
      filteredTrades = filteredTrades.filter(trade => trade.symbol === symbol);
    }
    
    if (side && side !== 'all') {
      filteredTrades = filteredTrades.filter(trade => trade.side === side);
    }
    
    if (dateFrom) {
      filteredTrades = filteredTrades.filter(trade => new Date(trade.date) >= new Date(dateFrom));
    }
    
    if (dateTo) {
      filteredTrades = filteredTrades.filter(trade => new Date(trade.date) <= new Date(dateTo));
    }
    
    if (tags && tags.length > 0) {
      filteredTrades = filteredTrades.filter(trade =>
        tags.some(tag => trade.tags?.some(tradeTag => 
          tradeTag.toLowerCase().includes(tag.toLowerCase())
        ))
      );
    }
    
    return NextResponse.json({
      trades: filteredTrades,
      count: filteredTrades.length,
      totalPnl: filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0),
      totalVolume: filteredTrades.reduce((sum, trade) => sum + (trade.quantity || 0), 0)
    });
  }

  // Authenticated mode - get user-specific data
  try {
    // TEMPORARY WORKAROUND: Next.js 15 + Auth0 compatibility issue
    // TODO: Remove this workaround when Auth0 releases Next.js 15 compatible version
    const { prisma: prismaInstance } = await import('@/lib/prisma');
    
    // Skip auth check for now and use actual logged in user
    let user = await prismaInstance.user.findFirst({
      where: { email: 'dannyvera127@gmail.com' }
    });
    
    if (!user) {
      user = await prismaInstance.user.create({
        data: {
          auth0Id: 'danny-auth0-id',
          email: 'dannyvera127@gmail.com',
          name: 'Danny Vera'
        }
      });
    }

    // Build where clause for filters
    const where: Prisma.TradeWhereInput = {
      userId: user.id
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

    // Get only trades from trades table (not individual orders)
    const trades = await prismaInstance.trade.findMany({
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
      shared: false,
      notes: trade.notes,
      tags: trade.tags
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
    // TEMPORARY WORKAROUND: Next.js 15 + Auth0 compatibility issue
    const { prisma: prismaInstance } = await import('@/lib/prisma');
    
    // Skip auth check for now and use actual logged in user
    let user = await prismaInstance.user.findFirst({
      where: { email: 'dannyvera127@gmail.com' }
    });
    
    if (!user) {
      user = await prismaInstance.user.create({
        data: {
          auth0Id: 'danny-auth0-id',
          email: 'dannyvera127@gmail.com',
          name: 'Danny Vera'
        }
      });
    }

    const body = await request.json();
    
    const now = new Date();
    const newTrade = await prismaInstance.trade.create({
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