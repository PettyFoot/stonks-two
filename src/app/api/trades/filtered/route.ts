import { NextResponse } from 'next/server';
import { TradeFilters } from '@/types';
import { Prisma, TradeSide } from '@prisma/client';
import { mockTrades } from '@/data/mockData';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

// Helper function to convert 12-hour format to 24-hour format for comparison
function convertTo24Hour(timeStr: string): string {
  // If already in 24-hour format (no AM/PM), return as is
  if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
    return timeStr.substring(0, 5); // Return just HH:MM part
  }
  
  const [time, modifier] = timeStr.split(' ');
  const timeParts = time.split(':');
  let hours = timeParts[0];
  const minutes = timeParts[1];
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier === 'PM') {
    hours = String(parseInt(hours, 10) + 12);
  }
  
  return `${hours.padStart(2, '0')}:${minutes}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const filters: TradeFilters = body.filters || {};
    const page: number = body.page || 1;
    const limit: number = body.limit || 50;
    const demo: boolean = body.demo || false;

    // Validate and normalize side filter
    if (filters.side) {
      const normalizedSide = filters.side.toLowerCase();
      if (!['all', 'long', 'short'].includes(normalizedSide)) {
        console.error('Invalid side filter received:', filters.side);
        return NextResponse.json(
          { error: 'Invalid side filter. Must be "all", "long", or "short".' },
          { status: 400 }
        );
      }
      filters.side = normalizedSide as 'all' | 'long' | 'short';
    }

    // Demo mode - filter mock data
    if (demo) {
      let filteredTrades = mockTrades;

      // Apply filters
      if (filters.symbols && filters.symbols.length > 0) {
        filteredTrades = filteredTrades.filter(trade => 
          filters.symbols!.includes(trade.symbol)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredTrades = filteredTrades.filter(trade =>
          filters.tags!.some(tag => 
            trade.tags?.some(tradeTag => 
              tradeTag.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      if (filters.side && filters.side !== 'all') {
        filteredTrades = filteredTrades.filter(trade => 
          trade.side.toLowerCase() === filters.side
        );
      }

      if (filters.priceRange) {
        filteredTrades = filteredTrades.filter(trade => {
          // For demo, use PnL as proxy for price since mock data doesn't have entry/exit prices
          const price = Math.abs(trade.pnl / (trade.quantity || 1));
          return price >= filters.priceRange!.min && price <= filters.priceRange!.max;
        });
      }

      if (filters.volumeRange) {
        filteredTrades = filteredTrades.filter(trade =>
          trade.quantity >= filters.volumeRange!.min && 
          trade.quantity <= filters.volumeRange!.max
        );
      }

      if (filters.executionCountRange) {
        filteredTrades = filteredTrades.filter(trade =>
          trade.executions >= filters.executionCountRange!.min && 
          trade.executions <= filters.executionCountRange!.max
        );
      }

      if (filters.dateRange) {
        filteredTrades = filteredTrades.filter(trade => {
          const tradeDate = new Date(trade.date);
          return tradeDate >= filters.dateRange!.start && tradeDate <= filters.dateRange!.end;
        });
      }

      // Time range filter (time of day) for demo mode
      if (filters.timeRange) {
        filteredTrades = filteredTrades.filter(trade => {
          if (!trade.time) return false;
          
          // Convert time string (e.g., "09:31 AM") to 24-hour format for comparison
          const tradeTime = convertTo24Hour(trade.time);
          const startTime = filters.timeRange!.start;
          const endTime = filters.timeRange!.end;
          
          return tradeTime >= startTime && tradeTime <= endTime;
        });
      }

      // Apply pagination
      const totalCount = filteredTrades.length;
      const startIndex = (page - 1) * limit;
      const paginatedTrades = filteredTrades.slice(startIndex, startIndex + limit);

      // Convert times to 12-hour format for consistency with database mode
      const transformedTrades = paginatedTrades.map(trade => {
        if (trade.time && trade.time.includes(':') && !trade.time.includes('AM') && !trade.time.includes('PM')) {
          // Convert 24-hour format to 12-hour format
          const [hours, minutes] = trade.time.split(':');
          const hour24 = parseInt(hours, 10);
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          return {
            ...trade,
            time: `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`
          };
        }
        return trade;
      });

      return NextResponse.json({
        trades: transformedTrades,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        totalPnl: filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0),
        totalVolume: filteredTrades.reduce((sum, trade) => sum + (trade.quantity || 0), 0)
      });
    }

    // Authenticated mode - query database
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Build complex where clause
    const where: Prisma.TradeWhereInput = {
      userId: user.id
    };

    // Symbol filter
    if (filters.symbols && filters.symbols.length > 0) {
      where.symbol = { in: filters.symbols };
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    // Side filter
    if (filters.side && filters.side !== 'all') {
      const uppercaseSide = filters.side.toUpperCase();
      // Ensure only valid TradeSide enum values are used
      if (uppercaseSide === 'LONG' || uppercaseSide === 'SHORT') {
        where.side = uppercaseSide as TradeSide;
      }
    }

    // Price range filter (using entryPrice and exitPrice)
    if (filters.priceRange) {
      where.OR = [
        {
          entryPrice: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
          }
        },
        {
          exitPrice: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
          }
        }
      ];
    }

    // Volume range filter
    if (filters.volumeRange) {
      where.quantity = {
        gte: filters.volumeRange.min,
        lte: filters.volumeRange.max
      };
    }

    // Execution count range filter
    if (filters.executionCountRange) {
      where.executions = {
        gte: filters.executionCountRange.min,
        lte: filters.executionCountRange.max
      };
    }

    // Date range filter
    if (filters.dateRange) {
      where.date = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
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

    // Open trades filter - by default hide open trades unless checkbox is checked
    if (!filters.showOpenTrades) {
      where.status = 'CLOSED';
    }

    // Time range filter (time of day) - we'll apply this in post-processing for simplicity
    // since Prisma doesn't easily support TIME() extraction in filters

    // Get total count for pagination
    const totalCount = await prisma.trade.count({ where });

    // Get paginated results
    const trades = await prisma.trade.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { openTime: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Get aggregated data for totals
    const aggregateResult = await prisma.trade.aggregate({
      where,
      _sum: {
        pnl: true,
        quantity: true
      }
    });

    // Transform trades to match frontend interface
    let transformedTrades = trades.map(trade => ({
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
      quantity: trade.quantity || 0,
      executions: trade.executions,
      pnl: typeof trade.pnl === 'object' ? trade.pnl.toNumber() : trade.pnl,
      shared: false,
      notes: trade.notes,
      tags: trade.tags,
      entryPrice: trade.entryPrice ? Number(trade.entryPrice) : undefined,
      exitPrice: trade.exitPrice ? Number(trade.exitPrice) : undefined,
      holdingPeriod: trade.holdingPeriod || undefined,
      status: trade.status || undefined,
      commission: trade.commission ? Number(trade.commission) : undefined,
      fees: trade.fees ? Number(trade.fees) : undefined
    }));

    // Apply time range filter after transformation
    if (filters.timeRange) {
      transformedTrades = transformedTrades.filter(trade => {
        if (!trade.time) return false;
        
        // Convert time string to 24-hour format for comparison
        const tradeTime = convertTo24Hour(trade.time);
        const startTime = filters.timeRange!.start;
        const endTime = filters.timeRange!.end;
        
        return tradeTime >= startTime && tradeTime <= endTime;
      });
    }

    // Recalculate totals if time filtering was applied
    const finalTotalPnl = filters.timeRange 
      ? transformedTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      : (aggregateResult._sum.pnl ? Number(aggregateResult._sum.pnl) : 0);
    
    const finalTotalVolume = filters.timeRange
      ? transformedTrades.reduce((sum, trade) => sum + trade.quantity, 0)
      : (aggregateResult._sum.quantity || 0);

    const finalTotalCount = filters.timeRange ? transformedTrades.length : totalCount;

    return NextResponse.json({
      trades: transformedTrades,
      pagination: {
        page,
        limit,
        total: finalTotalCount,
        totalPages: Math.ceil(finalTotalCount / limit)
      },
      totalPnl: finalTotalPnl,
      totalVolume: finalTotalVolume
    });

  } catch (error) {
    console.error('Filtered trades API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}