import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { mockTrades } from '@/data/mockData';
import { Prisma, TradeSide } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const demo = url.searchParams.get('demo') === 'true';
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
    
    let userId: string;
    
    if (demo) {
      userId = getDemoUserId();
    } else {
      const user = await getCurrentUser();
      if (!user?.auth0Id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const dbUser = await prisma.user.findUnique({
        where: { auth0Id: user.auth0Id }
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      userId = dbUser.id;
    }
    
    // Extract filter parameters
    const symbols = url.searchParams.get('symbols')?.split(',').filter(Boolean) || [];
    const sides = url.searchParams.get('sides')?.split(',').filter(Boolean) || [];
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const dateFromParam = url.searchParams.get('dateFrom');
    const dateToParam = url.searchParams.get('dateTo');
    const timeFrame = url.searchParams.get('timeFrame');

    const dbUser = await prisma.user.findUnique({
      where: { auth0Id: user.auth0Id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate date range - use filter dates if provided, otherwise use year
    let startDate: Date;
    let endDate: Date;
    
    if (dateFromParam && dateToParam) {
      startDate = new Date(dateFromParam);
      endDate = new Date(dateToParam);
    } else if (timeFrame && timeFrame !== 'all') {
      // Handle time frame presets
      endDate = new Date();
      switch (timeFrame) {
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.UTC(year, 0, 1));
          endDate = new Date(Date.UTC(year + 1, 0, 1));
      }
    } else {
      startDate = new Date(Date.UTC(year, 0, 1));
      endDate = new Date(Date.UTC(year + 1, 0, 1));
    }

    // Use Prisma's findMany with aggregation for better security and filter support
    const whereConditions: Prisma.TradeWhereInput = {
      userId: userId,
      date: {
        gte: startDate,
        lt: endDate
      },
      status: 'CLOSED'
    };

    if (symbols.length > 0) {
      whereConditions.symbol = { in: symbols };
    }

    if (sides.length > 0) {
      whereConditions.side = { in: sides as TradeSide[] };
    }

    if (tags.length > 0) {
      whereConditions.tags = { hasSome: tags };
    }

    // Get trades grouped by date using Prisma
    const trades = await prisma.trade.findMany({
      where: whereConditions,
      select: {
        date: true,
        pnl: true
      }
    });

    // Group by date and calculate statistics
    const dailyMap: Record<string, {tradeCount: number; pnl: number; winRate: number}> = {};
    
    trades.forEach(trade => {
      const dateStr = trade.date.toISOString().slice(0, 10);
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { tradeCount: 0, pnl: 0, winRate: 0 };
      }
      dailyMap[dateStr].tradeCount++;
      dailyMap[dateStr].pnl += Number(trade.pnl);
    });

    // Calculate win rates
    Object.keys(dailyMap).forEach(dateStr => {
      const dayTrades = trades.filter(t => t.date.toISOString().slice(0, 10) === dateStr);
      const wins = dayTrades.filter(t => Number(t.pnl) > 0).length;
      dailyMap[dateStr].winRate = dailyMap[dateStr].tradeCount > 0 
        ? Math.round((wins / dailyMap[dateStr].tradeCount) * 100) 
        : 0;
    });

    return NextResponse.json({ year, dailyData: dailyMap });
  } catch (error) {
    console.error('Calendar year-daily API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}