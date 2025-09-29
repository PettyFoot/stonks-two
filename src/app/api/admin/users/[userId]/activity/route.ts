import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/auth0';

interface PageStat {
  path: string;
  visitCount: number;
  totalDuration: number;
  avgDuration: number;
  lastVisited: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin authentication
    await requireAdminAuth();

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');

    // Calculate the date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Fetch all page views for the user within the date range
    const pageViews = await prisma.pageView.findMany({
      where: {
        userId,
        enteredAt: {
          gte: dateThreshold,
        },
      },
      orderBy: {
        enteredAt: 'desc',
      },
    });

    // Calculate summary stats
    const totalPageViews = pageViews.length;
    const uniquePagesVisited = new Set(pageViews.map(pv => pv.path)).size;
    const totalTimeSpent = pageViews.reduce((sum, pv) => sum + (pv.duration || 0), 0);
    const lastActive = pageViews.length > 0 ? pageViews[0].enteredAt : null;

    // Group by path and calculate stats
    const pathStats = new Map<string, {
      visitCount: number;
      totalDuration: number;
      lastVisited: Date;
    }>();

    pageViews.forEach(pv => {
      const existing = pathStats.get(pv.path);
      if (existing) {
        existing.visitCount++;
        existing.totalDuration += pv.duration || 0;
        if (pv.enteredAt > existing.lastVisited) {
          existing.lastVisited = pv.enteredAt;
        }
      } else {
        pathStats.set(pv.path, {
          visitCount: 1,
          totalDuration: pv.duration || 0,
          lastVisited: pv.enteredAt,
        });
      }
    });

    // Convert to array and calculate averages
    const pageStats: PageStat[] = Array.from(pathStats.entries()).map(([path, stats]) => ({
      path,
      visitCount: stats.visitCount,
      totalDuration: stats.totalDuration,
      avgDuration: stats.visitCount > 0 ? Math.round(stats.totalDuration / stats.visitCount) : 0,
      lastVisited: stats.lastVisited,
    }));

    // Sort by visit count (most visited first)
    pageStats.sort((a, b) => b.visitCount - a.visitCount);

    return NextResponse.json({
      summary: {
        totalPageViews,
        uniquePagesVisited,
        totalTimeSpent,
        lastActive,
      },
      pageStats,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}