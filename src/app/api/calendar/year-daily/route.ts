import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.auth0Id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();

    const dbUser = await prisma.user.findUnique({
      where: { auth0Id: user.auth0Id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all daily data for the entire year
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year + 1, 0, 1));

    const dailyData = await prisma.$queryRaw<
      Array<{ day: Date; trade_count: bigint; total_pnl: number | null; wins: bigint }>
    >`
      SELECT 
        DATE(date) as day,
        COUNT(*) as trade_count,
        SUM(pnl) as total_pnl,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
      FROM trades
      WHERE "userId" = ${dbUser.id}
        AND date >= ${startDate}
        AND date < ${endDate}
        AND status = 'CLOSED'
      GROUP BY DATE(date)
      ORDER BY day;
    `;

    // Convert to a map for easy lookup
    const dailyMap: Record<string, {tradeCount: number; pnl: number; winRate: number}> = {};
    dailyData.forEach(d => {
      const dateStr = d.day.toISOString().slice(0, 10);
      dailyMap[dateStr] = {
        tradeCount: Number(d.trade_count),
        pnl: d.total_pnl || 0,
        winRate: d.trade_count ? Math.round((Number(d.wins) / Number(d.trade_count)) * 100) : 0
      };
    });

    return NextResponse.json({ year, dailyData: dailyMap });
  } catch (error) {
    console.error('Calendar year-daily API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}