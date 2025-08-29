import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { mockTrades } from '@/data/mockData';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const demo = url.searchParams.get('demo') === 'true';
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month')); // 1-12

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

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    let result: Array<{
      day: string;
      tradeCount: number;
      pnl: number;
      winRate: number;
    }>;

    if (demo) {
      // Use mock data for demo mode
      const filteredTrades = mockTrades.filter(trade => {
        const tradeDate = new Date(trade.date);
        return tradeDate >= start && tradeDate < end && trade.status === 'CLOSED';
      });

      // Group trades by day
      const dayGroups = new Map<string, Array<typeof mockTrades[0]>>();
      filteredTrades.forEach(trade => {
        const dayKey = trade.date.split('T')[0]; // Get YYYY-MM-DD part
        if (!dayGroups.has(dayKey)) {
          dayGroups.set(dayKey, []);
        }
        dayGroups.get(dayKey)!.push(trade);
      });

      result = Array.from(dayGroups.entries()).map(([day, trades]) => {
        const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
        const wins = trades.filter(t => t.pnl > 0).length;
        return {
          day,
          tradeCount: trades.length,
          pnl: totalPnl,
          winRate: trades.length ? Math.round((wins / trades.length) * 100) : 0
        };
      }).sort((a, b) => a.day.localeCompare(b.day));
    } else {
      // Use database for real users
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

      result = rows.map(r => ({
        day: r.day.toISOString().slice(0, 10),
        tradeCount: Number(r.trade_count),
        pnl: r.total_pnl || 0,
        winRate: r.trade_count ? Math.round((Number(r.wins) / Number(r.trade_count)) * 100) : 0
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Calendar month API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}