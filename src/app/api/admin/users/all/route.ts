import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { prisma } from '@/lib/prisma';

// GET - List all users with order and trade statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users with order and trade counts
    const allUsers = await prisma.user.findMany({
      where: {
        deletedAt: null // Only active users
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        snapTradeUserId: true,
        autoSyncEnabled: true,
        // Count orders
        _count: {
          select: {
            orders: true,
            trades: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get additional statistics for each user
    const usersWithStats = await Promise.all(
      allUsers.map(async (user) => {
        // Get unprocessed orders count
        const unprocessedOrders = await prisma.order.count({
          where: {
            userId: user.id,
            usedInTrade: false
          }
        });

        // Get open trades count
        const openTrades = await prisma.trade.count({
          where: {
            userId: user.id,
            status: 'OPEN'
          }
        });

        // Get completed trades count
        const completedTrades = await prisma.trade.count({
          where: {
            userId: user.id,
            status: 'CLOSED'
          }
        });

        // Get total P&L for completed trades
        const pnlResult = await prisma.trade.aggregate({
          where: {
            userId: user.id,
            status: 'CLOSED'
          },
          _sum: {
            pnl: true
          }
        });

        // Get last trade calculation timestamp (we'll use trade updatedAt as proxy)
        const lastTrade = await prisma.trade.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        });

        return {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          hasSnapTradeConnection: !!user.snapTradeUserId,
          snapTradeUserId: user.snapTradeUserId,
          autoSyncEnabled: user.autoSyncEnabled,
          statistics: {
            totalOrders: user._count.orders,
            totalTrades: user._count.trades,
            unprocessedOrders,
            openTrades,
            completedTrades,
            totalPnL: Number(pnlResult._sum.pnl || 0),
            lastTradeCalculation: lastTrade?.updatedAt || null
          }
        };
      })
    );

    // Calculate overall statistics
    const totalStatistics = usersWithStats.reduce(
      (acc, user) => ({
        totalUsers: acc.totalUsers + 1,
        totalOrders: acc.totalOrders + user.statistics.totalOrders,
        totalTrades: acc.totalTrades + user.statistics.totalTrades,
        totalUnprocessedOrders: acc.totalUnprocessedOrders + user.statistics.unprocessedOrders,
        totalOpenTrades: acc.totalOpenTrades + user.statistics.openTrades,
        totalCompletedTrades: acc.totalCompletedTrades + user.statistics.completedTrades,
        totalPnL: acc.totalPnL + user.statistics.totalPnL
      }),
      {
        totalUsers: 0,
        totalOrders: 0,
        totalTrades: 0,
        totalUnprocessedOrders: 0,
        totalOpenTrades: 0,
        totalCompletedTrades: 0,
        totalPnL: 0
      }
    );

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      statistics: totalStatistics
    });

  } catch (error) {
    console.error('Error fetching all users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}