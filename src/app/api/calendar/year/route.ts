import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { getDemoUserId } from '@/lib/demo/demoSession';

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

    // Use database for both demo and authenticated users
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

    const monthlyData = rows.map(r => ({
      month: r.month,
      month_name: r.month_name,
      total_pnl: r.total_pnl,
      trade_count: Number(r.trade_count),
      wins: Number(r.wins)
    }));

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