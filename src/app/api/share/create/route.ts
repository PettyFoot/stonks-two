import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { tradesRepo } from '@/lib/repositories/tradesRepo';
import { ordersRepo } from '@/lib/repositories/ordersRepo';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper function to generate a secure random share key
function generateShareKey(): string {
  return crypto.randomBytes(9).toString('base64url'); // 12 characters
}

// Helper function to sanitize trade data for sharing (remove PII)
function sanitizeTradeData(trade: any) {
  return {
    id: trade.id,
    date: trade.date,
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    executions: trade.executions,
    pnl: trade.pnl,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    entryDate: trade.entryDate,
    exitDate: trade.exitDate,
    timeInTrade: trade.timeInTrade,
    holdingPeriod: trade.holdingPeriod,
    status: trade.status,
    notes: trade.notes,
    tags: trade.tags,
    commission: trade.commission,
    fees: trade.fees,
    marketSession: trade.marketSession,
    orderType: trade.orderType,
    openTime: trade.openTime,
    closeTime: trade.closeTime,
    costBasis: trade.costBasis,
    proceeds: trade.proceeds,
    ordersCount: trade.ordersCount,
    netPnl: trade.netPnl || trade.pnl,
    commissions: trade.commission
  };
}

// Helper function to sanitize order data for sharing (remove PII)
function sanitizeOrderData(orders: any[]) {
  return orders.map(order => ({
    id: order.id,
    orderId: order.orderId,
    symbol: order.symbol,
    orderType: order.orderType,
    side: order.side,
    timeInForce: order.timeInForce,
    orderQuantity: order.orderQuantity,
    limitPrice: order.limitPrice,
    stopPrice: order.stopPrice,
    orderStatus: order.orderStatus,
    orderPlacedTime: order.orderPlacedTime,
    orderExecutedTime: order.orderExecutedTime,
    orderUpdatedTime: order.orderUpdatedTime,
    orderCancelledTime: order.orderCancelledTime,
    orderRoute: order.orderRoute,
    brokerType: order.brokerType,
    tags: order.tags
  }));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tradeId, date } = body;

    if (!tradeId && !date) {
      return NextResponse.json(
        { error: 'Either tradeId or date is required' },
        { status: 400 }
      );
    }

    // Check if user has reached the limit of 20 active shares
    const activeSharesCount = await prisma.sharedTrade.count({
      where: {
        userId: user.id,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (activeSharesCount >= 20) {
      return NextResponse.json(
        { error: 'You have reached the maximum limit of 20 active shared trades' },
        { status: 429 }
      );
    }

    let trade: any = null;
    let orders: any[] = [];

    if (tradeId) {
      // Get specific trade by ID
      trade = await tradesRepo.getTradeById(user.id, tradeId);
      if (!trade) {
        return NextResponse.json(
          { error: 'Trade not found' },
          { status: 404 }
        );
      }
    } else if (date) {
      // Get all trades for the date (for records sharing)
      const recordsDate = new Date(date);
      const trades = await tradesRepo.getTradesForRecordsDate(user.id, recordsDate);
      
      if (!trades || trades.length === 0) {
        return NextResponse.json(
          { error: 'No trades found for the specified date' },
          { status: 404 }
        );
      }

      // For records sharing, create a combined trade object
      const summary = await tradesRepo.getRecordsSummary(
        user.id, 
        new Date(recordsDate.setUTCHours(0, 0, 0, 0)),
        new Date(recordsDate.setUTCHours(23, 59, 59, 999))
      );

      trade = {
        id: `records_${date}`,
        date: recordsDate,
        symbol: 'MULTIPLE',
        side: 'LONG',
        quantity: summary.totalVolume,
        executions: trades.reduce((sum, t) => sum + (t.executions || 0), 0),
        pnl: summary.totalPnl,
        status: 'CLOSED',
        notes: trades.find(t => t.status === 'BLANK')?.notes || '',
        tags: [],
        commission: trades.reduce((sum, t) => sum + (Number(t.commission) || 0), 0),
        fees: trades.reduce((sum, t) => sum + (Number(t.fees) || 0), 0),
        marketSession: 'REGULAR',
        orderType: 'MARKET',
        totalTrades: summary.totalTrades,
        winRate: summary.winRate,
        trades: trades.filter(t => t.status !== 'BLANK'),
        isRecordsShare: true
      };

      // Get all orders for all trades in the record
      const allOrders = await Promise.all(
        trades.map(async (t) => {
          if (t.isCalculated && t.ordersInTrade && t.ordersInTrade.length > 0) {
            return await ordersRepo.getOrdersByIds(t.ordersInTrade);
          }
          return [];
        })
      );
      
      orders = allOrders.flat().filter(order => order.symbol);
    }

    // Validate that we have a trade to share
    if (!trade) {
      return NextResponse.json(
        { error: 'No trade data found to share' },
        { status: 404 }
      );
    }

    // Get orders for single trade if not records share
    if (tradeId && trade.isCalculated && trade.ordersInTrade && trade.ordersInTrade.length > 0) {
      orders = await ordersRepo.getOrdersByIds(trade.ordersInTrade);
      // Filter to only matching symbols
      orders = orders.filter(order => order.symbol === trade.symbol);
    }

    // Generate unique share key
    let shareKey: string = '';
    let keyExists = true;
    let attempts = 0;
    
    while (keyExists && attempts < 10) {
      shareKey = generateShareKey();
      const existing = await prisma.sharedTrade.findUnique({
        where: { shareKey }
      });
      keyExists = !!existing;
      attempts++;
    }
    
    if (keyExists) {
      return NextResponse.json(
        { error: 'Failed to generate unique share key. Please try again.' },
        { status: 500 }
      );
    }

    // Create expiration date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Sanitize data for sharing
    const sanitizedTrade = sanitizeTradeData(trade);
    const sanitizedOrders = sanitizeOrderData(orders);

    // Create shared trade record
    const sharedTrade = await prisma.sharedTrade.create({
      data: {
        shareKey: shareKey,
        userId: user.id,
        tradeSnapshot: sanitizedTrade,
        orderSnapshot: sanitizedOrders,
        metadata: {
          originalTradeId: tradeId,
          shareDate: date,
          isRecordsShare: !!date,
          createdBy: user.email // Keep for audit purposes only
        },
        expiresAt
      }
    });

    // Generate share URL
    const baseUrl = process.env.AUTH0_BASE_URL || 'http://localhost:3002';
    const shareUrl = `${baseUrl}/share/record/${shareKey}`;

    return NextResponse.json({
      shareKey,
      shareUrl,
      expiresAt,
      success: true
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create share',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}