import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Share key is required' },
        { status: 400 }
      );
    }

    // Use Prisma's native methods instead of raw SQL function
    const sharedTrade = await prisma.sharedTrade.findUnique({
      where: { shareKey: key }
    });

    if (!sharedTrade) {
      return NextResponse.json(
        { error: 'Shared trade not found' },
        { status: 404 }
      );
    }

    // Check if the share has expired
    if (new Date() > sharedTrade.expiresAt) {
      return NextResponse.json(
        { error: 'This shared trade link has expired' },
        { status: 410 } // Gone
      );
    }

    // Increment access count (but not API call count - that's only for chart requests)
    await prisma.sharedTrade.update({
      where: { shareKey: key },
      data: {
        accessCount: {
          increment: 1
        }
      }
    });

    // Calculate usage statistics
    const remainingCalls = sharedTrade.maxApiCalls - sharedTrade.apiCallCount;
    const usagePercentage = sharedTrade.maxApiCalls > 0
      ? Math.round((sharedTrade.apiCallCount / sharedTrade.maxApiCalls) * 100 * 100) / 100
      : 0;

    const usageLevel = usagePercentage >= 90 ? 'CRITICAL' :
                      usagePercentage >= 70 ? 'HIGH' :
                      usagePercentage >= 50 ? 'MEDIUM' : 'LOW';

    // Check share type
    const isStatsShare = (sharedTrade.metadata as any)?.isStatsShare;
    const isCalendarMonthShare = (sharedTrade.metadata as any)?.isCalendarMonthShare;
    const isCalendarYearShare = (sharedTrade.metadata as any)?.isCalendarYearShare;

    // Return the appropriate data structure based on share type
    return NextResponse.json({
      trade: sharedTrade.tradeSnapshot,
      orders: sharedTrade.orderSnapshot,
      metadata: sharedTrade.metadata,
      expiresAt: sharedTrade.expiresAt,
      createdAt: sharedTrade.createdAt,
      isStatsShare,
      isCalendarMonthShare,
      isCalendarYearShare,
      // Add API usage information
      apiUsage: {
        used: sharedTrade.apiCallCount,
        remaining: remainingCalls,
        total: sharedTrade.maxApiCalls,
        percentage: usagePercentage,
        level: usageLevel,
        lastApiCall: sharedTrade.lastApiCallAt
      },
      success: true
    });

  } catch (error) {
    console.error('Share retrieval error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to retrieve shared trade',
        details: 'Please check the URL and try again'
      },
      { status: 500 }
    );
  }
}