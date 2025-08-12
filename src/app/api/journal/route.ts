import { NextResponse } from 'next/server';
import { mockJournalEntries } from '@/data/mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  
  let entries = mockJournalEntries;
  
  if (date) {
    entries = entries.filter(entry => 
      new Date(entry.date).toDateString() === new Date(date).toDateString()
    );
  }
  
  return NextResponse.json({
    entries,
    count: entries.length
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // In a real app, this would save to a database
  const newEntry = {
    id: (mockJournalEntries.length + 1).toString(),
    date: body.date || new Date().toDateString(),
    pnl: body.pnl || 0,
    totalTrades: body.totalTrades || 0,
    totalVolume: body.totalVolume || 0,
    winRate: body.winRate,
    notes: body.notes || '',
    trades: body.trades || []
  };
  
  return NextResponse.json(newEntry, { status: 201 });
}