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
    const demo = searchParams.get('demo') === 'true';

    // Demo mode - return mock data
    if (demo) {
      const { mockJournalEntries } = await import('@/data/mockData');
      let entries = mockJournalEntries;
      
      if (date) {
        entries = entries.filter(entry => 
          new Date(entry.date).toDateString() === new Date(date).toDateString()
        );
      }
      
      return NextResponse.json({
        entries,
        count: entries.length
      });
    }

    // Authenticated mode
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

    const journalDate = new Date(date);

    // Get trades for the specified date
    const trades = await tradesRepo.getTradesForJournalDate(user.id, journalDate);

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
          
          if (ordersInTradeCount !== foundOrdersCount) {
            console.warn(`[JOURNAL API] Order fetching issue detected for trade ${trade.id}:`, {
              tradeId: trade.id,
              symbol: trade.symbol,
              date: trade.date.toISOString(),
              status: trade.status,
              ordersInTradeArray: trade.ordersInTrade || [],
              ordersInTradeCount,
              foundOrdersCount,
              foundOrderIds: orders.map(o => o.id),
              missingOrderIds: (trade.ordersInTrade || []).filter(id => !orders.some(o => o.id === id)),
              issueType: ordersInTradeCount > foundOrdersCount ? 'ORDERS_NOT_FOUND_IN_DB' : 'UNEXPECTED_EXTRA_ORDERS',
              recommendation: 'Check if order IDs in ordersInTrade array exist in orders table'
            });
          }
          
          // Log if no orders found for calculated trade
          if (orders.length === 0 && trade.status !== 'BLANK') {
            console.warn(`[JOURNAL API] No orders found for calculated trade:`, {
              tradeId: trade.id,
              symbol: trade.symbol,
              status: trade.status,
              ordersInTradeArray: trade.ordersInTrade || [],
              message: 'Calculated trade has no linked orders - this may indicate data corruption'
            });
          }
          
          executions = orders.map(order => ({
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

    // Get journal summary for the date
    const summary = await tradesRepo.getJournalSummary(
      user.id, 
      new Date(journalDate.setUTCHours(0, 0, 0, 0)),
      new Date(journalDate.setUTCHours(23, 59, 59, 999))
    );

    // Aggregate all executions from all trades into a single array
    const allExecutions = tradesWithExecutions.reduce((acc, trade) => {
      if (trade.executionDetails && trade.executionDetails.length > 0) {
        return [...acc, ...trade.executionDetails];
      }
      return acc;
    }, [] as ExecutionOrder[]);

    // Create journal entry format
    const journalEntry = {
      id: `journal_${user.id}_${date}`,
      date,
      pnl: summary.totalPnl,
      totalTrades: summary.totalTrades,
      totalVolume: summary.totalVolume,
      winRate: summary.winRate,
      notes: tradesWithExecutions.find(t => t.status === 'BLANK')?.notes || '',
      notesChanges: tradesWithExecutions.find(t => t.status === 'BLANK')?.notesChanges || '',
      trades: tradesWithExecutions.filter(t => t.status !== 'BLANK'), // Separate actual trades from journal notes
      journalNotes: tradesWithExecutions.filter(t => t.status === 'BLANK'), // Blank entries for notes
      executions: allExecutions // Include all executions from all trades
    };

    return NextResponse.json({
      entries: [journalEntry],
      count: 1,
      success: true
    });

  } catch (error) {
    console.error('Journal API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch journal data',
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

    const journalDate = new Date(date);

    // Get existing trades for the date to calculate summary
    const summary = await tradesRepo.getJournalSummary(
      user.id, 
      new Date(journalDate.setUTCHours(0, 0, 0, 0)),
      new Date(journalDate.setUTCHours(23, 59, 59, 999))
    );

    // Create or update a journal entry (blank trade) for general notes
    let blankTrade = null;
    if (notes && notes.trim().length > 0) {
      // Check for existing blank trade for this date
      const existingBlankTrade = await tradesRepo.getTradesForJournalDate(user.id, journalDate);
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
            date: journalDate,
            entryDate: journalDate,
            symbol: 'JOURNAL',
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

    const journalEntry = {
      id: `journal_${user.id}_${date}`,
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

    return NextResponse.json(journalEntry, { status: 201 });

  } catch (error) {
    console.error('Create journal entry error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create journal entry',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}