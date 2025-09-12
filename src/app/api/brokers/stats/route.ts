import { NextRequest, NextResponse } from 'next/server';
import { BrokerFormatService } from '@/lib/brokerFormatService';
import { getCurrentUser } from '@/lib/auth0';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const brokerService = new BrokerFormatService();
    
    const [stats, popularFormats] = await Promise.all([
      brokerService.getFormatStats(),
      brokerService.getPopularFormats(10)
    ]);

    return NextResponse.json({
      stats,
      popularFormats: popularFormats.map(format => ({
        id: format.id,
        broker: format.broker.name,
        formatName: format.formatName,
        usageCount: format.usageCount,
        successRate: format.successRate,
        lastUsed: format.lastUsed
      }))
    });

  } catch (error) {
    console.error('Broker stats error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get stats'
    }, { status: 500 });
  }
}