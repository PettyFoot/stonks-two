import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradeFilterService } from '@/lib/services/tradeFilterService';
import { Prisma } from '@prisma/client';

// GET endpoint for auto-complete search (better caching, lighter weight)
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ 
        success: true, 
        trades: [], 
        count: 0,
        query: '' 
      });
    }

    const searchTerm = query.trim();

    // Parse filters from URL search parameters
    const filters = TradeFilterService.parseFiltersFromRequest(url.searchParams, user.id);
    
    // Build the base where clause using the filter service
    const baseWhere = TradeFilterService.buildWhereClause(filters);

    // Add search conditions - prioritize symbol matches for auto-complete
    const searchWhere = {
      ...baseWhere,
      OR: [
        {
          symbol: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          notes: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ]
    };

    // Execute the search query with minimal fields for performance
    const trades = await prisma.trade.findMany({
      where: searchWhere,
      orderBy: [
        { date: 'desc' },
      ],
      select: {
        id: true,
        date: true,
        symbol: true,
        side: true,
        quantity: true,
        pnl: true,
        status: true,
        notes: true,
        tags: true
      },
      take: 50 // Limit for auto-complete
    });

    // Format trades for response
    const formattedTrades = trades.map(trade => ({
      ...trade,
      date: trade.date.toISOString().split('T')[0],
      pnl: Number(trade.pnl) || 0,
      quantity: Number(trade.quantity) || 0
    }));

    // Add cache headers for GET requests
    const response = NextResponse.json({
      success: true,
      trades: formattedTrades,
      count: formattedTrades.length,
      query: searchTerm
    });

    // Set cache headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    return response;

  } catch (error) {
    console.error('Search GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to search trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const searchTerm = query.trim();

    // Parse filters from the request URL (if provided in search params)
    const url = new URL(request.url);
    const filters = TradeFilterService.parseFiltersFromRequest(url.searchParams, user.id);
    
    // Build the base where clause using the filter service
    const baseWhere = TradeFilterService.buildWhereClause(filters);

    // Add search conditions to the where clause
    const searchWhere = {
      ...baseWhere,
      OR: [
        {
          symbol: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          notes: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          tags: {
            hasSome: [searchTerm.toLowerCase()]
          }
        }
      ]
    };

    // Execute the search query
    const trades = await prisma.trade.findMany({
      where: searchWhere,
      orderBy: [
        { date: 'desc' },
      ],
      select: {
        id: true,
        date: true,
        symbol: true,
        side: true,
        quantity: true,
        pnl: true,
        entryPrice: true,
        exitPrice: true,
        notes: true,
        status: true,
        holdingPeriod: true,
        executions: true,
        tags: true
      },
      take: 50 // Limit results to prevent overwhelming the UI
    });

    // Format trades for response
    const formattedTrades = trades.map(trade => ({
      ...trade,
      date: trade.date.toISOString().split('T')[0],
      pnl: Number(trade.pnl) || 0,
      entryPrice: Number(trade.entryPrice) || 0,
      exitPrice: Number(trade.exitPrice) || 0,
      quantity: Number(trade.quantity) || 0
    }));

    return NextResponse.json({
      success: true,
      trades: formattedTrades,
      count: formattedTrades.length,
      query: searchTerm
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search trades' },
      { status: 500 }
    );
  }
}