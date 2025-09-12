import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    await requireAdminAuth();

    // Get user stats
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Get import stats
    const totalImports = await prisma.importBatch.count();
    const recentUploads = await prisma.importBatch.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    // Get pending reviews
    const pendingReviews = await prisma.aiIngestToCheck.count({
      where: {
        adminReviewStatus: 'PENDING'
      }
    });

    // Get trade and order stats
    const totalTrades = await prisma.trade.count();
    const totalOrders = await prisma.order.count();

    const stats = {
      totalUsers,
      activeUsers,
      totalImports,
      pendingReviews,
      totalTrades,
      totalOrders,
      recentUploads,
      systemHealth: 'Healthy'
    };

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message === 'Admin access required') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}