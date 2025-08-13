import { NextResponse } from 'next/server';
import { mockTrades } from '@/data/mockData';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradeType, Prisma } from '@prisma/client';

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
      totalVolume: filteredTrades.reduce((sum, trade) => sum + trade.volume, 0)
    });
  }

  // Authenticated mode - get user-specific data
  try {
    // TEMPORARY WORKAROUND: Next.js 15 + Auth0 compatibility issue
    // TODO: Remove this workaround when Auth0 releases Next.js 15 compatible version
    const { prisma: prismaInstance } = await import('@/lib/prisma');
    
    // Skip auth check for now and use test user directly
    let user = await prismaInstance.user.findFirst({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      user = await prismaInstance.user.create({
        data: {
          auth0Id: 'test-auth0-id',
          email: 'test@example.com',
          name: 'Test User'
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

    if (side && side !== 'all') {
      where.side = side.toUpperCase() as TradeType;
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

    // Get both trades and orders (since CSV uploads go to orders table)
    const [trades, orders] = await Promise.all([
      prismaInstance.trade.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { orderFilledTime: 'desc' }
        ]
      }),
      prismaInstance.order.findMany({
        where: {
          userId: user.id,
          ...(symbol && symbol !== 'Symbol' ? { symbol } : {}),
          ...(side && side !== 'all' ? { side: side.toUpperCase() as any } : {}),
          ...(dateFrom || dateTo ? {
            orderExecutedTime: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {})
            }
          } : {}),
          ...(tags && tags.length > 0 ? {
            tags: { hasSome: tags }
          } : {})
        },
        orderBy: [
          { orderExecutedTime: 'desc' }
        ]
      })
    ]);

    // Transform trades to match frontend interface
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      date: trade.date.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: trade.orderFilledTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      symbol: trade.symbol,
      side: trade.side.toLowerCase() as 'long' | 'short',
      volume: trade.volume,
      executions: trade.executions,
      pnl: trade.pnl,
      shared: false,
      notes: trade.notes,
      tags: trade.tags
    }));

    // Transform orders to match frontend trade interface
    const transformedOrders = orders.map(order => ({
      id: order.id,
      date: order.orderExecutedTime?.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }) || new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: order.orderExecutedTime?.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) || new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      symbol: order.symbol,
      side: order.side.toLowerCase() as 'long' | 'short',
      volume: order.orderQuantity,
      executions: 1,
      pnl: 0, // Orders don't have P&L
      shared: false,
      notes: `${order.orderType} order`,
      tags: order.tags || []
    }));

    // Combine trades and orders, sort by date/time
    const allTrades = [...transformedTrades, ...transformedOrders]
      .sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());

    return NextResponse.json({
      trades: transformedTrades,
      count: transformedTrades.length,
      totalPnl: transformedTrades.reduce((sum, trade) => sum + trade.pnl, 0),
      totalVolume: transformedTrades.reduce((sum, trade) => sum + trade.volume, 0)
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
    
    // Skip auth check for now and use test user directly
    let user = await prismaInstance.user.findFirst({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      user = await prismaInstance.user.create({
        data: {
          auth0Id: 'test-auth0-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      });
    }

    const body = await request.json();
    
    const now = new Date();
    const newTrade = await prismaInstance.trade.create({
      data: {
        userId: user.id,
        date: body.date ? new Date(body.date) : now,
        orderFilledTime: body.date ? new Date(body.date) : now,
        entryDate: body.date ? new Date(body.date) : now,
        symbol: body.symbol,
        side: (body.side || 'long').toUpperCase() as TradeType,
        volume: body.volume || 0,
        quantityFilled: body.volume || 0,
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
      time: newTrade.orderFilledTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      symbol: newTrade.symbol,
      side: newTrade.side.toLowerCase() as 'long' | 'short',
      volume: newTrade.volume,
      executions: newTrade.executions,
      pnl: newTrade.pnl,
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