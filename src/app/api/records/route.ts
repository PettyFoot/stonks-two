import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { tradesRepo } from '@/lib/repositories/tradesRepo';
import { ordersRepo } from '@/lib/repositories/ordersRepo';
import { prisma } from '@/lib/prisma';
import { ExecutionOrder } from '@/components/ExecutionsTable';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const tradeId = searchParams.get('tradeId'); // Get optional trade ID

    // Get current user (handles both demo and Auth0)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const recordsDate = new Date(date);

    // Get trades for the specified date, optionally filtered by trade ID
    let trades;
    if (tradeId) {
      // Get specific trade by ID
      const specificTrade = await tradesRepo.getTradeById(user.id, tradeId);
      trades = specificTrade ? [specificTrade] : [];
    } else {
      // Get all trades for the date
      trades = await tradesRepo.getTradesForRecordsDate(user.id, recordsDate);
    }

    // Transform trades and get executions for each
    const tradesWithExecutions = await Promise.all(
      trades.map(async (trade) => {
        let executions: ExecutionOrder[] = [];
        
        // Get orders/executions for calculated trades using the ordersInTrade array
        // This directly fetches orders by their IDs stored in the trade
        if (trade.isCalculated && trade.ordersInTrade && trade.ordersInTrade.length > 0) {
          const orders = await ordersRepo.getOrdersByIds(trade.ordersInTrade);
          
          // Enhanced data consistency logging for debugging data integrity issues
          const ordersInTradeCount = trade.ordersInTrade ? trade.ordersInTrade.length : 0;
          const foundOrdersCount = orders.length;
          const foundOrderSymbols = [...new Set(orders.map(o => o.symbol))];
          const hasSymbolMismatch = foundOrderSymbols.some(symbol => symbol !== trade.symbol);
          
          if (ordersInTradeCount !== foundOrdersCount) {
            console.warn(`[RECORDS API] Order fetching issue detected for trade ${trade.id}:`, {
              tradeId: trade.id,
              symbol: trade.symbol,
              date: trade.date.toISOString(),
              status: trade.status,
              ordersInTradeArray: trade.ordersInTrade || [],
              ordersInTradeCount,
              foundOrdersCount,
              foundOrderIds: orders.map(o => o.id),
              foundOrderSymbols,
              hasSymbolMismatch,
              missingOrderIds: (trade.ordersInTrade || []).filter(id => !orders.some(o => o.id === id)),
              issueType: ordersInTradeCount > foundOrdersCount ? 'ORDERS_NOT_FOUND_IN_DB' : 'UNEXPECTED_EXTRA_ORDERS',
              recommendation: 'Check if order IDs in ordersInTrade array exist in orders table'
            });
          }
          
          // Additional logging for symbol mismatches even when order counts match
          if (hasSymbolMismatch && ordersInTradeCount === foundOrdersCount) {
            console.warn(`[RECORDS API] Symbol mismatch detected in trade ${trade.id}:`, {
              tradeId: trade.id,
              tradeSymbol: trade.symbol,
              foundOrderSymbols,
              ordersWithSymbols: orders.map(o => ({ id: o.id, symbol: o.symbol })),
              message: 'Trade contains orders from different symbols - this indicates incorrect trade calculation',
              recommendation: 'Review trade builder logic to prevent cross-symbol order assignments'
            });
          }
          
          // Log if no orders found for calculated trade
          if (orders.length === 0 && trade.status !== 'BLANK') {
            console.warn(`[RECORDS API] No orders found for calculated trade:`, {
              tradeId: trade.id,
              symbol: trade.symbol,
              status: trade.status,
              ordersInTradeArray: trade.ordersInTrade || [],
              message: 'Calculated trade has no linked orders - this may indicate data corruption'
            });
          }
          
          // Filter orders to only include those matching the trade's symbol
          const filteredOrders = orders.filter(order => {
            const symbolMatches = order.symbol === trade.symbol;
            
            // Log data integrity issues for debugging
            if (!symbolMatches) {
              console.warn(`[RECORDS API] Symbol mismatch detected for trade ${trade.id}:`, {
                tradeId: trade.id,
                tradeSymbol: trade.symbol,
                orderSymbol: order.symbol,
                orderId: order.id,
                message: `Order ${order.id} with symbol ${order.symbol} found in trade ${trade.id} with symbol ${trade.symbol}`,
                recommendation: 'Check trade calculation logic - orders from different symbols should not be in the same trade'
              });
            }
            
            return symbolMatches;
          });
          
          // Log if any orders were filtered out due to symbol mismatch
          const filteredCount = orders.length - filteredOrders.length;
          if (filteredCount > 0) {
            console.warn(`[RECORDS API] Filtered out ${filteredCount} orders with mismatched symbols from trade ${trade.id}`);
          }
          
          executions = filteredOrders.map(order => ({
            id: order.id,
            userId: order.userId,
            orderId: order.orderId,
            parentOrderId: order.parentOrderId,
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
            accountId: order.accountId,
            orderAccount: order.orderAccount,
            orderRoute: order.orderRoute,
            brokerType: order.brokerType,
            tags: order.tags,
            usedInTrade: order.usedInTrade,
            tradeId: order.tradeId,
            importBatchId: order.importBatchId
          }));
        }

        return {
          id: trade.id,
          date: trade.date.toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }),
          time: trade.openTime ? trade.openTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }) : '00:00',
          symbol: trade.symbol,
          side: trade.side.toLowerCase() as 'long' | 'short',
          quantity: trade.quantity || 0,
          executions: trade.executions || executions.length,
          pnl: trade.pnl.toNumber(),
          entryPrice: trade.entryPrice ? trade.entryPrice.toString() : undefined,
          exitPrice: trade.exitPrice ? trade.exitPrice.toString() : undefined,
          holdingPeriod: trade.holdingPeriod || undefined,
          status: trade.status,
          shared: false,
          notes: trade.notes,
          notesChanges: trade.notesChanges,
          tags: trade.tags,
          executionDetails: executions // Include detailed executions
        };
      })
    );

    // Get records summary for the date
    const summary = await tradesRepo.getRecordsSummary(
      user.id, 
      new Date(recordsDate.setUTCHours(0, 0, 0, 0)),
      new Date(recordsDate.setUTCHours(23, 59, 59, 999))
    );

    // Aggregate all executions from all trades into a single array
    const allExecutions = tradesWithExecutions.reduce((acc, trade) => {
      if (trade.executionDetails && trade.executionDetails.length > 0) {
        return [...acc, ...trade.executionDetails];
      }
      return acc;
    }, [] as ExecutionOrder[]);

    // Calculate total volume directly from executions (more accurate than summary)
    const totalVolumeFromExecutions = allExecutions.reduce((sum, execution) => {
      return sum + (execution.orderQuantity || 0);
    }, 0);

    // Create records entry format
    const recordsEntry = {
      id: `records_${user.id}_${date}`,
      date,
      pnl: summary.totalPnl,
      totalTrades: summary.totalTrades,
      totalVolume: totalVolumeFromExecutions,
      winRate: summary.winRate,
      notes: tradesWithExecutions.find(t => t.status === 'BLANK')?.notes || '',
      notesChanges: tradesWithExecutions.find(t => t.status === 'BLANK')?.notesChanges || '',
      trades: tradesWithExecutions.filter(t => t.status !== 'BLANK'), // Separate actual trades from records notes
      recordsNotes: tradesWithExecutions.filter(t => t.status === 'BLANK'), // Blank entries for notes
      executions: allExecutions // Include all executions from all trades
    };

    return NextResponse.json({
      entries: [recordsEntry],
      count: 1,
      success: true
    });

  } catch (error) {
    console.error('Records API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch records data',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
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
    const { date, notes, chartImage } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const recordsDate = new Date(date);

    // Get existing trades for the date to calculate summary
    const summary = await tradesRepo.getRecordsSummary(
      user.id, 
      new Date(recordsDate.setUTCHours(0, 0, 0, 0)),
      new Date(recordsDate.setUTCHours(23, 59, 59, 999))
    );

    // Create or update a records entry (blank trade) for general notes
    let blankTrade = null;
    if (notes && notes.trim().length > 0) {
      // Check for existing blank trade for this date
      const existingBlankTrade = await tradesRepo.getTradesForRecordsDate(user.id, recordsDate);
      const blankTradeForDate = existingBlankTrade.find(t => t.status === 'BLANK');

      if (blankTradeForDate) {
        // Update existing blank trade
        blankTrade = await prisma.trade.update({
          where: { id: blankTradeForDate.id },
          data: { notes }
        });
      } else {
        // Create new blank trade
        blankTrade = await prisma.trade.create({
          data: {
            userId: user.id,
            date: recordsDate,
            entryDate: recordsDate,
            symbol: 'RECORDS',
            side: 'LONG',
            quantity: 0,
            executions: 0,
            pnl: 0,
            status: 'BLANK',
            notes,
            ordersInTrade: [],
            ordersCount: 0,
            isCalculated: false
          }
        });
      }
    }

    const recordsEntry = {
      id: `records_${user.id}_${date}`,
      date,
      pnl: summary.totalPnl,
      totalTrades: summary.totalTrades,
      totalVolume: summary.totalVolume,
      winRate: summary.winRate,
      notes: blankTrade?.notes || '',
      notesChanges: blankTrade?.notesChanges || '',
      chartImage: chartImage || null,
      trades: summary.trades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side.toLowerCase(),
        pnl: trade.pnl.toNumber(),
        quantity: trade.quantity || 0,
        date: trade.date.toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }),
        time: trade.openTime ? trade.openTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '00:00',
        executions: trade.executions || 0,
        entryPrice: trade.entryPrice?.toString(),
        exitPrice: trade.exitPrice?.toString(),
        holdingPeriod: trade.holdingPeriod,
        status: trade.status,
        notes: trade.notes,
        tags: trade.tags
      }))
    };

    return NextResponse.json(recordsEntry, { status: 201 });

  } catch (error) {
    console.error('Create records entry error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create records entry',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}