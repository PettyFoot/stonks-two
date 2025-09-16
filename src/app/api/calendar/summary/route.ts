import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { mockTrades } from '@/data/mockData';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const demo = url.searchParams.get('demo') === 'true';
    
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

    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const timeframe = url.searchParams.get('timeframe') || 'all'; // month, year, all

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
    } else if (timeframe === 'month') {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeframe === 'year') {
      endDate = new Date();
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Build WHERE clause
    const whereClause = Prisma.sql`WHERE "userId" = ${userId} AND status = 'CLOSED'`;
    const dateFilter = startDate && endDate 
      ? Prisma.sql` AND date >= ${startDate} AND date < ${endDate}`
      : Prisma.empty;

    // Fetch and log all trades being used in the calculation
    const allTrades = await prisma.$queryRaw<
      Array<{ 
        id: number; 
        date: Date; 
        symbol: string; 
        side: string; 
        quantity: number; 
        entry_price: number | null; 
        exit_price: number | null; 
        pnl: number | null; 
        status: string;
      }>
    >`
      SELECT 
        id,
        date,
        symbol,
        side,
        quantity,
        "entryPrice" as entry_price,
        "exitPrice" as exit_price,
        pnl,
        status
      FROM trades
      ${whereClause}
      ${dateFilter}
      ORDER BY date DESC;
    `;






    allTrades.forEach((trade, index) => {

    });


    // Performance by Day of Month (1-31)
    const dailyPerf = await prisma.$queryRaw<
      Array<{ day: number; total_pnl: number | null; trade_count: bigint; total_shares: bigint | null }>
    >`
      SELECT 
        EXTRACT(DAY FROM date)::int as day,
        SUM(pnl) as total_pnl,
        COUNT(*) as trade_count,
        SUM(COALESCE(quantity, 0)) as total_shares
      FROM trades
      ${whereClause}
      ${dateFilter}
      GROUP BY EXTRACT(DAY FROM date)
      ORDER BY day;
    `;

    // Performance by Month of Year
    const monthlyPerf = await prisma.$queryRaw<
      Array<{ month: number; month_name: string; total_pnl: number | null; trade_count: bigint; total_shares: bigint | null }>
    >`
      SELECT 
        EXTRACT(MONTH FROM date)::int as month,
        MAX(TO_CHAR(date, 'Mon')) as month_name,
        SUM(pnl) as total_pnl,
        COUNT(*) as trade_count,
        SUM(COALESCE(quantity, 0)) as total_shares
      FROM trades
      ${whereClause}
      ${dateFilter}
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month;
    `;

    // Performance by Year
    const yearlyPerf = await prisma.$queryRaw<
      Array<{ year: number; total_pnl: number | null; trade_count: bigint; total_shares: bigint | null }>
    >`
      SELECT 
        EXTRACT(YEAR FROM date)::int as year,
        SUM(pnl) as total_pnl,
        COUNT(*) as trade_count,
        SUM(COALESCE(quantity, 0)) as total_shares
      FROM trades
      ${whereClause}
      ${dateFilter}
      GROUP BY EXTRACT(YEAR FROM date)
      ORDER BY year;
    `;

    // Calculate totals for validation
    const dailyTotals = {
      trades: dailyPerf.reduce((sum, d) => sum + Number(d.trade_count), 0),
      shares: dailyPerf.reduce((sum, d) => sum + Number(d.total_shares || 0), 0),
      pnl: dailyPerf.reduce((sum, d) => sum + (d.total_pnl || 0), 0)
    };

    const monthlyTotals = {
      trades: monthlyPerf.reduce((sum, m) => sum + Number(m.trade_count), 0),
      shares: monthlyPerf.reduce((sum, m) => sum + Number(m.total_shares || 0), 0),
      pnl: monthlyPerf.reduce((sum, m) => sum + (m.total_pnl || 0), 0)
    };

    const yearlyTotals = {
      trades: yearlyPerf.reduce((sum, y) => sum + Number(y.trade_count), 0),
      shares: yearlyPerf.reduce((sum, y) => sum + Number(y.total_shares || 0), 0),
      pnl: yearlyPerf.reduce((sum, y) => sum + (y.total_pnl || 0), 0)
    };

















    return NextResponse.json({
      daily: dailyPerf.map(d => ({
        day: d.day,
        pnl: d.total_pnl || 0,
        trades: Number(d.trade_count),
        shares: Number(d.total_shares || 0)
      })),
      monthly: monthlyPerf.map(m => ({
        month: m.month,
        monthName: m.month_name,
        pnl: m.total_pnl || 0,
        trades: Number(m.trade_count),
        shares: Number(m.total_shares || 0)
      })),
      yearly: yearlyPerf.map(y => ({
        year: y.year,
        pnl: y.total_pnl || 0,
        trades: Number(y.trade_count),
        shares: Number(y.total_shares || 0)
      }))
    });
  } catch (error) {
    console.error('Calendar summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}