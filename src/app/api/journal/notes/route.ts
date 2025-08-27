import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { TradeStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notes, date, tradeId, saveChanges = false } = body;

    // Validate input
    if (typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Notes must be a string' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const journalDate = new Date(date);
    
    // If a specific tradeId is provided, update that trade's notes
    if (tradeId) {
      // Verify the trade belongs to the user
      const existingTrade = await prisma.trade.findFirst({
        where: {
          id: tradeId,
          userId: user.id
        }
      });

      if (!existingTrade) {
        return NextResponse.json(
          { error: 'Trade not found or access denied' },
          { status: 404 }
        );
      }

      // Update the trade's notes based on the operation type
      const updateData = saveChanges 
        ? { notes, notesChanges: notes } // Save changes: copy notesChanges to notes
        : { notesChanges: notes }; // Auto-save: save to notesChanges only

      const updatedTrade = await prisma.trade.update({
        where: { id: tradeId },
        data: updateData
      });

      return NextResponse.json({
        success: true,
        message: saveChanges ? 'Trade notes saved successfully' : 'Trade notes auto-saved to draft',
        trade: {
          id: updatedTrade.id,
          notes: updatedTrade.notes,
          notesChanges: updatedTrade.notesChanges,
          date: updatedTrade.date,
          symbol: updatedTrade.symbol
        }
      });
    }

    // If no tradeId provided, check for existing trades on this date
    const existingTradesForDate = await prisma.trade.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(journalDate.setUTCHours(0, 0, 0, 0)),
          lt: new Date(journalDate.setUTCHours(23, 59, 59, 999))
        },
        status: {
          not: TradeStatus.BLANK // Don't include existing blank trades
        }
      }
    });

    if (existingTradesForDate.length > 0) {
      // Check for existing blank trade to hold journal notes
      let blankTrade = await prisma.trade.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: new Date(journalDate.setUTCHours(0, 0, 0, 0)),
            lt: new Date(journalDate.setUTCHours(23, 59, 59, 999))
          },
          status: TradeStatus.BLANK
        }
      });

      const updateData = saveChanges 
        ? { notes, notesChanges: notes } // Save changes: copy notesChanges to notes
        : { notesChanges: notes }; // Auto-save: save to notesChanges only

      if (blankTrade) {
        // Update existing blank trade
        blankTrade = await prisma.trade.update({
          where: { id: blankTrade.id },
          data: updateData
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
            status: TradeStatus.BLANK,
            ...updateData,
            ordersInTrade: [],
            ordersCount: 0,
            isCalculated: false
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: saveChanges ? 'Journal notes saved successfully' : 'Journal notes auto-saved to draft',
        trade: {
          id: blankTrade.id,
          notes: blankTrade.notes,
          notesChanges: blankTrade.notesChanges,
          date: blankTrade.date,
          symbol: blankTrade.symbol,
          status: blankTrade.status
        }
      });
    }

    // No trades exist for this date, create a blank trade to hold the notes
    const updateData = saveChanges 
      ? { notes, notesChanges: notes } // Save changes: copy notesChanges to notes
      : { notesChanges: notes }; // Auto-save: save to notesChanges only

    const blankTrade = await prisma.trade.create({
      data: {
        userId: user.id,
        date: journalDate,
        entryDate: journalDate,
        symbol: 'JOURNAL',
        side: 'LONG',
        quantity: 0,
        executions: 0,
        pnl: 0,
        status: TradeStatus.BLANK,
        ...updateData,
        ordersInTrade: [],
        ordersCount: 0,
        isCalculated: false
      }
    });

    return NextResponse.json({
      success: true,
      message: saveChanges ? 'Journal notes saved successfully' : 'Journal notes auto-saved to draft',
      trade: {
        id: blankTrade.id,
        notes: blankTrade.notes,
        notesChanges: blankTrade.notesChanges,
        date: blankTrade.date,
        symbol: blankTrade.symbol,
        status: blankTrade.status
      }
    });

  } catch (error) {
    console.error('Error saving journal notes:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save notes',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const tradeId = searchParams.get('tradeId');

    // If tradeId is provided, get notes for that specific trade
    if (tradeId) {
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

      return NextResponse.json({
        success: true,
        trade: {
          id: trade.id,
          notes: trade.notes || '',
          notesChanges: trade.notesChanges || '',
          date: trade.date,
          symbol: trade.symbol,
          status: trade.status
        }
      });
    }

    // If date is provided, get all notes for trades on that date
    if (date) {
      const journalDate = new Date(date);
      const startOfDay = new Date(journalDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(journalDate.setUTCHours(23, 59, 59, 999));

      const trades = await prisma.trade.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      const tradesWithNotes = trades
        .filter(trade => (trade.notes && trade.notes.trim().length > 0) || 
                        (trade.notesChanges && trade.notesChanges.trim().length > 0))
        .map(trade => ({
          id: trade.id,
          notes: trade.notes || '',
          notesChanges: trade.notesChanges || '',
          date: trade.date,
          symbol: trade.symbol,
          status: trade.status,
          pnl: trade.pnl.toNumber()
        }));

      return NextResponse.json({
        success: true,
        date,
        trades: tradesWithNotes,
        count: tradesWithNotes.length
      });
    }

    // Neither tradeId nor date provided
    return NextResponse.json(
      { error: 'Either tradeId or date parameter is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching journal notes:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
        details: 'Please try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}