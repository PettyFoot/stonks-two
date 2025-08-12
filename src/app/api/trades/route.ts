import { NextResponse } from 'next/server';
import { mockTrades } from '@/data/mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const symbol = searchParams.get('symbol');
  const side = searchParams.get('side');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const tags = searchParams.get('tags')?.split(',');
  
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

export async function POST(request: Request) {
  const body = await request.json();
  
  // In a real app, this would save to a database
  const newTrade = {
    id: (mockTrades.length + 1).toString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    symbol: body.symbol,
    side: body.side || 'long',
    volume: body.volume || 0,
    executions: body.executions || 1,
    pnl: body.pnl || 0,
    notes: body.notes,
    tags: body.tags || []
  };
  
  return NextResponse.json(newTrade, { status: 201 });
}