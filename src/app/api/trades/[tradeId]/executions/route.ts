import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { ordersRepo } from '@/lib/repositories/ordersRepo';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { tradeId: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tradeId } = params;

    // Validate tradeId parameter
    if (!tradeId || typeof tradeId !== 'string') {
      return NextResponse.json(
        { error: 'Valid tradeId is required' },
        { status: 400 }
      );
    }

    // Verify that the trade belongs to the user
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        userId: user.id
      }
    });

    if (!trade) {
      return NextResponse.json(
        { error: 'Trade not found or access denied' },
        { status: 404 }
      );
    }

    // Get all orders associated with this trade
    const orders = await ordersRepo.getOrdersByTradeId(tradeId);

    // Transform orders to match frontend expectations
    const executions = orders.map(order => ({
      id: order.id,
      orderId: order.orderId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      quantity: order.orderQuantity,
      price: order.limitPrice ? order.limitPrice.toNumber() : null,
      stopPrice: order.stopPrice ? order.stopPrice.toNumber() : null,
      status: order.orderStatus,
      placedTime: order.orderPlacedTime,
      executedTime: order.orderExecutedTime,
      cancelledTime: order.orderCancelledTime,
      route: order.orderRoute,
      account: order.orderAccount,
      tags: order.tags,
      brokerType: order.brokerType
    }));

    return NextResponse.json({
      success: true,
      tradeId,
      executions,
      count: executions.length,
      trade: {
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        status: trade.status,
        date: trade.date,
        entryPrice: trade.entryPrice ? trade.entryPrice.toString() : null,
        exitPrice: trade.exitPrice ? trade.exitPrice.toString() : null,
        pnl: trade.pnl.toNumber(),
        quantity: trade.quantity,
        notes: trade.notes
      }
    });

  } catch (error) {
    console.error('Error fetching trade executions:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch trade executions',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}