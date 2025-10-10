import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Get current user (handles both demo and Auth0)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch all trades for the user
    const trades = await prisma.trade.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        id: true,
        date: true,
        entryDate: true,
        exitDate: true,
        symbol: true,
        assetClass: true,
        side: true,
        status: true,
        entryPrice: true,
        exitPrice: true,
        avgEntryPrice: true,
        avgExitPrice: true,
        quantity: true,
        openQuantity: true,
        closeQuantity: true,
        pnl: true,
        commission: true,
        fees: true,
        orderType: true,
        timeInForce: true,
        marketSession: true,
        holdingPeriod: true,
        executions: true,
        notes: true,
        tags: true,
        brokerName: true,
        brokerId: true,
        broker: {
          select: {
            name: true
          }
        },
        tradeSource: true,
        costBasis: true,
        proceeds: true,
        timeInTrade: true,
        highDuringTrade: true,
        lowDuringTrade: true
      }
    });

    // Fetch all orders for the user
    const orders = await prisma.order.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        orderPlacedTime: 'desc'
      },
      select: {
        id: true,
        orderId: true,
        parentOrderId: true,
        symbol: true,
        orderType: true,
        side: true,
        timeInForce: true,
        orderQuantity: true,
        limitPrice: true,
        stopPrice: true,
        orderStatus: true,
        orderPlacedTime: true,
        orderExecutedTime: true,
        orderUpdatedTime: true,
        orderCancelledTime: true,
        accountId: true,
        orderAccount: true,
        orderRoute: true,
        brokerType: true,
        brokerId: true,
        broker: {
          select: {
            name: true
          }
        },
        tags: true,
        tradeId: true
      }
    });

    // Format trades data for CSV
    const tradesForCSV = trades.map(trade => ({
      Type: 'Trade',
      ID: trade.id,
      Date: trade.date.toISOString().split('T')[0],
      'Entry Date': trade.entryDate ? trade.entryDate.toISOString().split('T')[0] : '',
      'Exit Date': trade.exitDate ? trade.exitDate.toISOString().split('T')[0] : '',
      Symbol: trade.symbol,
      'Asset Class': trade.assetClass,
      Side: trade.side,
      Status: trade.status,
      'Entry Price': trade.entryPrice ? Number(trade.entryPrice) : '',
      'Exit Price': trade.exitPrice ? Number(trade.exitPrice) : '',
      'Avg Entry Price': trade.avgEntryPrice ? Number(trade.avgEntryPrice) : '',
      'Avg Exit Price': trade.avgExitPrice ? Number(trade.avgExitPrice) : '',
      Quantity: trade.quantity || '',
      'Open Quantity': trade.openQuantity || '',
      'Close Quantity': trade.closeQuantity || '',
      'P&L': Number(trade.pnl),
      Commission: trade.commission ? Number(trade.commission) : '',
      Fees: trade.fees ? Number(trade.fees) : '',
      'Order Type': trade.orderType,
      'Time in Force': trade.timeInForce,
      'Market Session': trade.marketSession,
      'Holding Period': trade.holdingPeriod,
      Executions: trade.executions,
      'Cost Basis': trade.costBasis ? Number(trade.costBasis) : '',
      Proceeds: trade.proceeds ? Number(trade.proceeds) : '',
      'Time in Trade (seconds)': trade.timeInTrade || '',
      'High During Trade': trade.highDuringTrade ? Number(trade.highDuringTrade) : '',
      'Low During Trade': trade.lowDuringTrade ? Number(trade.lowDuringTrade) : '',
      Notes: trade.notes || '',
      Tags: trade.tags.join(', '),
      'Broker': trade.broker?.name || trade.brokerName || '',
      'Broker ID': trade.brokerId || '',
      'Trade Source': trade.tradeSource
    }));

    // Format orders data for CSV
    const ordersForCSV = orders.map(order => ({
      Type: 'Order',
      ID: order.id,
      'Order ID': order.orderId,
      'Parent Order ID': order.parentOrderId || '',
      Date: order.orderPlacedTime.toISOString().split('T')[0],
      'Placed Time': order.orderPlacedTime.toISOString(),
      'Executed Time': order.orderExecutedTime ? order.orderExecutedTime.toISOString() : '',
      'Updated Time': order.orderUpdatedTime ? order.orderUpdatedTime.toISOString() : '',
      'Cancelled Time': order.orderCancelledTime ? order.orderCancelledTime.toISOString() : '',
      Symbol: order.symbol,
      'Order Type': order.orderType,
      Side: order.side,
      'Time in Force': order.timeInForce,
      'Order Quantity': order.orderQuantity,
      'Limit Price': order.limitPrice ? Number(order.limitPrice) : '',
      'Stop Price': order.stopPrice ? Number(order.stopPrice) : '',
      'Order Status': order.orderStatus,
      'Account ID': order.accountId || '',
      'Order Account': order.orderAccount || '',
      'Order Route': order.orderRoute || '',
      'Broker Type': order.brokerType,
      'Broker': order.broker?.name || '',
      'Broker ID': order.brokerId || '',
      Tags: order.tags.join(', '),
      'Associated Trade ID': order.tradeId || ''
    }));

    // Combine trades and orders data
    const combinedData = [...tradesForCSV, ...ordersForCSV];

    // Generate CSV using Papa Parse
    const csv = Papa.unparse(combinedData, {
      header: true,
      delimiter: ',',
      quotes: true
    });

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `stonks_data_export_${currentDate}.csv`;

    // Return CSV file as download
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data. Please try again.' }, 
      { status: 500 }
    );
  }
}