import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { OrderStagingService } from '@/lib/services/OrderStagingService';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  migrationStatus: z.enum(['PENDING', 'APPROVED', 'MIGRATING', 'MIGRATED', 'FAILED', 'REJECTED']).optional(),
  brokerCsvFormatId: z.string().optional()
});

/**
 * GET /api/staging/orders
 * Get staged orders for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      migrationStatus: searchParams.get('migrationStatus'),
      brokerCsvFormatId: searchParams.get('brokerCsvFormatId')
    };

    const validation = QuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const options = validation.data;

    const stagingService = new OrderStagingService();
    const result = await stagingService.getStagedOrders(user.id, options);

    // Transform orders for frontend display
    const transformedOrders = result.orders.map(order => ({
      id: order.id,
      rowIndex: order.rowIndex,
      migrationStatus: order.migrationStatus,
      createdAt: order.createdAt,
      brokerFormat: {
        formatName: order.brokerCsvFormat.formatName,
        brokerName: order.brokerCsvFormat.broker.name
      },
      // Extract key fields from raw CSV data for preview
      preview: {
        symbol: (order.rawCsvRow as any)?.symbol || (order.rawCsvRow as any)?.Symbol || (order.rawCsvRow as any)?.Instrument || 'N/A',
        quantity: (order.rawCsvRow as any)?.quantity || (order.rawCsvRow as any)?.Quantity || (order.rawCsvRow as any)?.Qty || 'N/A',
        side: (order.rawCsvRow as any)?.side || (order.rawCsvRow as any)?.Side || (order.rawCsvRow as any)?.Action || 'N/A',
        price: (order.rawCsvRow as any)?.price || (order.rawCsvRow as any)?.Price || (order.rawCsvRow as any)?.LimitPrice || 'N/A',
        date: (order.rawCsvRow as any)?.date || (order.rawCsvRow as any)?.Date || (order.rawCsvRow as any)?.ExecutedTime || 'N/A'
      },
      // Include confidence from initial mapping
      mappingConfidence: (order.initialMappedData as any)?.confidence || 0.5
    }));

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      pagination: {
        total: result.total,
        limit: options.limit,
        offset: options.offset,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('[API] Get staged orders error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get staged orders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}