import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const demo = url.searchParams.get('demo') === 'true';
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month')); // 1-12
    const startDate = url.searchParams.get('startDate'); // Optional: for calendar grid range
    const endDate = url.searchParams.get('endDate'); // Optional: for calendar grid range

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

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

    // Use provided date range if available (for calendar grid including edge days)
    // Otherwise default to the month boundaries
    const start = startDate ? new Date(startDate) : new Date(Date.UTC(year, month - 1, 1));
    const end = endDate ? new Date(endDate) : new Date(Date.UTC(year, month, 1));

    // Use database for both demo and authenticated users
    const rows = await prisma.$queryRaw<
      Array<{ day: Date; trade_count: bigint; total_pnl: number | null; wins: bigint }>
    >`
      SELECT 
        DATE(date) as day,
        COUNT(*) as trade_count,
        SUM(pnl) as total_pnl,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
      FROM trades
      WHERE "userId" = ${userId}
        AND date >= ${start}
        AND date < ${end}
        AND status = 'CLOSED'
      GROUP BY DATE(date)
      ORDER BY day;
    `;

    const result = rows.map(r => ({
      day: r.day.toISOString().slice(0, 10),
      tradeCount: Number(r.trade_count),
      pnl: r.total_pnl || 0,
      wins: Number(r.wins),
      winRate: r.trade_count ? Math.round((Number(r.wins) / Number(r.trade_count)) * 100) : 0
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calendar month API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}