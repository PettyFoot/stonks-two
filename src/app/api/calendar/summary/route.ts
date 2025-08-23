import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.auth0Id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const timeframe = url.searchParams.get('timeframe') || 'all'; // month, year, all

    const dbUser = await prisma.user.findUnique({
      where: { auth0Id: user.auth0Id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
    const whereClause = Prisma.sql`WHERE "userId" = ${dbUser.id} AND status = 'CLOSED'`;
    const dateFilter = startDate && endDate 
      ? Prisma.sql` AND date >= ${startDate} AND date < ${endDate}`
      : Prisma.empty;

    // Performance by Day of Month (1-31)
    const dailyPerf = await prisma.$queryRaw<
      Array<{ day: number; total_pnl: number | null; trade_count: bigint }>
    >`
      SELECT 
        EXTRACT(DAY FROM date)::int as day,
        SUM(pnl) as total_pnl,
        COUNT(*) as trade_count
      FROM trades
      ${whereClause}
      ${dateFilter}
      GROUP BY EXTRACT(DAY FROM date)
      ORDER BY day;
    `;

    // Performance by Month of Year
    const monthlyPerf = await prisma.$queryRaw<
      Array<{ month: number; month_name: string; total_pnl: number | null; trade_count: bigint }>
    >`
      SELECT 
        EXTRACT(MONTH FROM date)::int as month,
        TO_CHAR(date, 'Mon') as month_name,
        SUM(pnl) as total_pnl,
        COUNT(*) as trade_count
      FROM trades
      ${whereClause}
      ${dateFilter}
      GROUP BY EXTRACT(MONTH FROM date), TO_CHAR(date, 'Mon')
      ORDER BY month;
    `;

    // Performance by Year
    const yearlyPerf = await prisma.$queryRaw<
      Array<{ year: number; total_pnl: number | null; trade_count: bigint }>
    >`
      SELECT 
        EXTRACT(YEAR FROM date)::int as year,
        SUM(pnl) as total_pnl,
        COUNT(*) as trade_count
      FROM trades
      ${whereClause}
      ${dateFilter}
      GROUP BY EXTRACT(YEAR FROM date)
      ORDER BY year;
    `;

    return NextResponse.json({
      daily: dailyPerf.map(d => ({
        day: d.day,
        pnl: d.total_pnl || 0,
        trades: Number(d.trade_count)
      })),
      monthly: monthlyPerf.map(m => ({
        month: m.month,
        monthName: m.month_name,
        pnl: m.total_pnl || 0,
        trades: Number(m.trade_count)
      })),
      yearly: yearlyPerf.map(y => ({
        year: y.year,
        pnl: y.total_pnl || 0,
        trades: Number(y.trade_count)
      }))
    });
  } catch (error) {
    console.error('Calendar summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}