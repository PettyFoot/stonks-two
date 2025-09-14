import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';

interface RouteParams {
  params: Promise<{
    batchId: string;
  }>;
}

// GET - Get all orders associated with a specific import batch
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { batchId } = await params;

    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the batch exists and user has access to it
    const whereClause = user.isAdmin
      ? { id: batchId }
      : { id: batchId, userId: user.id };

    const batch = await prisma.importBatch.findFirst({
      where: whereClause,
      select: {
        id: true,
        filename: true,
        userId: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

    // Get all orders associated with this import batch
    const orders = await prisma.order.findMany({
      where: { importBatchId: batchId },
      select: {
        id: true,
        orderId: true,
        symbol: true,
        side: true,
        orderQuantity: true,
        limitPrice: true,
        stopPrice: true,
        orderStatus: true,
        orderPlacedTime: true,
        orderExecutedTime: true,
        orderCancelledTime: true,
        commission: true,
        fees: true,
        usedInTrade: true,
        tradeId: true,
        brokerType: true,
        importSequence: true
      },
      orderBy: [
        { importSequence: 'asc' },
        { orderPlacedTime: 'asc' }
      ]
    });

    const response = {
      batch: {
        id: batch.id,
        filename: batch.filename,
        userId: batch.userId,
        userEmail: batch.user?.email,
        userName: batch.user?.name
      },
      orders: orders,
      summary: {
        totalOrders: orders.length,
        orderStatuses: orders.reduce((acc, order) => {
          acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        usedInTrades: orders.filter(order => order.usedInTrade).length,
        unusedOrders: orders.filter(order => !order.usedInTrade).length
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching orders for import batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders for import batch' },
      { status: 500 }
    );
  }
}