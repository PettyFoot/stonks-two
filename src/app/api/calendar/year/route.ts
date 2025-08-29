import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';
import { mockTrades } from '@/data/mockData';

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

    let monthlyData: Array<{ month: number; month_name: string; total_pnl: number | null; trade_count: number; wins: number }>;

    if (demo) {
      // Use mock data for demo mode
      const yearTrades = mockTrades.filter(trade => {
        const tradeYear = new Date(trade.date).getFullYear();
        return tradeYear === year && trade.status === 'CLOSED';
      });

      // Group by month
      const monthGroups = new Map<number, Array<typeof mockTrades[0]>>();
      yearTrades.forEach(trade => {
        const month = new Date(trade.date).getMonth() + 1; // 1-based month
        if (!monthGroups.has(month)) {
          monthGroups.set(month, []);
        }
        monthGroups.get(month)!.push(trade);
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthlyData = Array.from(monthGroups.entries()).map(([month, trades]) => {
        const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
        const wins = trades.filter(t => t.pnl > 0).length;
        return {
          month,
          month_name: months[month - 1],
          total_pnl: totalPnl,
          trade_count: trades.length,
          wins
        };
      });
    } else {
      // Use database for real users
      const rows = await prisma.$queryRaw<
        Array<{ month: number; month_name: string; total_pnl: number | null; trade_count: bigint; wins: bigint }>
      >`
        SELECT 
          EXTRACT(MONTH FROM date)::int as month,
          TO_CHAR(date, 'Mon') as month_name,
          SUM(pnl) as total_pnl,
          COUNT(*) as trade_count,
          SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins
        FROM trades
        WHERE "userId" = ${userId}
          AND EXTRACT(YEAR FROM date) = ${year}
          AND status = 'CLOSED'
        GROUP BY EXTRACT(MONTH FROM date), TO_CHAR(date, 'Mon')
        ORDER BY month;
      `;

      monthlyData = rows.map(r => ({
        month: r.month,
        month_name: r.month_name,
        total_pnl: r.total_pnl,
        trade_count: Number(r.trade_count),
        wins: Number(r.wins)
      }));
    }

    // Create full year array with all 12 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearData = months.map((monthName, index) => {
      const monthNum = index + 1;
      const data = monthlyData.find(m => m.month === monthNum);
      return {
        month: monthNum,
        monthName,
        pnl: data?.total_pnl || 0,
        trades: data?.trade_count || 0,
        winRate: data?.trade_count ? Math.round((data.wins / data.trade_count) * 100) : 0
      };
    });

    return NextResponse.json({ year, months: yearData });
  } catch (error) {
    console.error('Calendar year API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}