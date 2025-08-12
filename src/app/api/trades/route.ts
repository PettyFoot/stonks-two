import { NextResponse } from 'next/server';
import { mockTrades } from '@/data/mockData';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradeType } from '@prisma/client';

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Build where clause for filters
    const where: any = {
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

    const trades = await prisma.trade.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { time: 'desc' }
      ]
    });

    // Transform to match frontend interface
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      date: trade.date.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: trade.time,
      symbol: trade.symbol,
      side: trade.side.toLowerCase() as 'long' | 'short',
      volume: trade.volume,
      executions: trade.executions,
      pnl: trade.pnl,
      shared: trade.shared,
      notes: trade.notes,
      tags: trade.tags
    }));

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    
    const newTrade = await prisma.trade.create({
      data: {
        userId: user.id,
        date: body.date ? new Date(body.date) : new Date(),
        time: body.time || new Date().toLocaleTimeString(),
        symbol: body.symbol,
        side: (body.side || 'long').toUpperCase() as TradeType,
        volume: body.volume || 0,
        executions: body.executions || 1,
        pnl: body.pnl || 0,
        notes: body.notes,
        tags: body.tags || [],
        shared: body.shared || false
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
      time: newTrade.time,
      symbol: newTrade.symbol,
      side: newTrade.side.toLowerCase() as 'long' | 'short',
      volume: newTrade.volume,
      executions: newTrade.executions,
      pnl: newTrade.pnl,
      shared: newTrade.shared,
      notes: newTrade.notes,
      tags: newTrade.tags
    };
    
    return NextResponse.json(transformedTrade, { status: 201 });
  } catch (error) {
    console.error('Create trade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}