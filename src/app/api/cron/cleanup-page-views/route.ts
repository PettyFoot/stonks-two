import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cron job to cleanup old page view records
 * Should be scheduled to run daily
 * Deletes page views older than 90 days
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate the date threshold (90 days ago)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Delete old page views
    const result = await prisma.pageView.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old page view records`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      threshold: ninetyDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error('Error cleaning up page views:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup page views' },
      { status: 500 }
    );
  }
}