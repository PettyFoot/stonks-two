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

    // Use secure function to get shared trade with usage statistics
    const result = await prisma.$queryRaw`
      SELECT * FROM get_shared_trade_with_usage(${key}::TEXT)
    ` as any[];

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Shared trade not found' },
        { status: 404 }
      );
    }

    const sharedTrade = result[0];

    // Check if the share has expired
    if (new Date() > new Date(sharedTrade.expires_at)) {
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

    // Calculate usage level for the frontend
    const usageLevel = sharedTrade.usage_percentage >= 90 ? 'CRITICAL' :
                      sharedTrade.usage_percentage >= 70 ? 'HIGH' :
                      sharedTrade.usage_percentage >= 50 ? 'MEDIUM' : 'LOW';

    // Return the trade and order data with usage statistics
    return NextResponse.json({
      trade: sharedTrade.trade_snapshot,
      orders: sharedTrade.order_snapshot,
      metadata: sharedTrade.metadata,
      expiresAt: sharedTrade.expires_at,
      createdAt: sharedTrade.created_at,
      // Add API usage information
      apiUsage: {
        used: sharedTrade.api_call_count,
        remaining: sharedTrade.remaining_calls,
        total: sharedTrade.max_api_calls,
        percentage: sharedTrade.usage_percentage,
        level: usageLevel,
        lastApiCall: sharedTrade.last_api_call_at
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