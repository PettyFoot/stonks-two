import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth0';
import { tradeCalculationService } from '@/services/tradeCalculation';

interface RouteParams {
  params: Promise<{
    batchId: string;
  }>;
}

// POST - Reprocess an import batch
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { batchId } = await params;
    
    // Get the authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the batch belongs to the user
    const batch = await prisma.importBatch.findFirst({
      where: {
        id: batchId,
        userId: user.id
      },
      include: {
        trades: true,
        orders: true
      }
    });

    if (!batch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'recalculate':
        // Recalculate trades from the orders in this batch
        if (batch.orders.length > 0) {
          await tradeCalculationService.buildTrades(user.id);
          return NextResponse.json({ 
            success: true, 
            message: 'Trades recalculated successfully',
            ordersProcessed: batch.orders.length 
          });
        } else {
          return NextResponse.json({ 
            success: false, 
            message: 'No orders to recalculate in this batch' 
          });
        }

      case 'delete_trades':
        // Delete only the trades from this batch, keep orders
        const deletedTrades = await prisma.trade.deleteMany({
          where: { importBatchId: batchId }
        });
        return NextResponse.json({ 
          success: true, 
          message: `Deleted ${deletedTrades.count} trades from batch`,
          tradesDeleted: deletedTrades.count
        });

      case 'delete_orders':
        // Delete only the orders from this batch, keep trades
        const deletedOrders = await prisma.order.deleteMany({
          where: { importBatchId: batchId }
        });
        return NextResponse.json({ 
          success: true, 
          message: `Deleted ${deletedOrders.count} orders from batch`,
          ordersDeleted: deletedOrders.count
        });

      case 'update_status':
        // Update the batch status
        const { status } = body;
        const updatedBatch = await prisma.importBatch.update({
          where: { id: batchId },
          data: { status }
        });
        return NextResponse.json({ 
          success: true, 
          message: 'Batch status updated',
          batch: updatedBatch
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Valid actions are: recalculate, delete_trades, delete_orders, update_status' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error reprocessing import batch:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess import batch' },
      { status: 500 }
    );
  }
}