import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { processUserOrders } from '@/lib/tradeBuilder';

export async function POST() {
  try {
    // Get the authenticated user
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.sub;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    console.log(`Processing trades for user: ${userId}`);
    
    // Process the user's orders into trades
    const newTrades = await processUserOrders(userId);
    
    // Calculate summary statistics
    const totalTrades = newTrades.length;
    const completedTrades = newTrades.filter(t => t.status === 'CLOSED');
    const openTrades = newTrades.filter(t => t.status === 'OPEN');
    
    const totalPnL = completedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winners = completedTrades.filter(t => t.pnl > 0).length;
    const losers = completedTrades.filter(t => t.pnl < 0).length;
    const winRate = completedTrades.length > 0 ? (winners / completedTrades.length) * 100 : 0;

    const response = {
      success: true,
      message: `Successfully processed ${totalTrades} trades`,
      data: {
        newTrades,
        summary: {
          totalTrades,
          completedTrades: completedTrades.length,
          openTrades: openTrades.length,
          totalPnL: Number(totalPnL.toFixed(2)),
          winners,
          losers,
          winRate: Number(winRate.toFixed(1)),
        }
      }
    };

    console.log(`Trade processing completed:`, response.data.summary);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error processing trades:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process trades',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get the authenticated user
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Trade processing endpoint is available',
      methods: ['POST'],
      description: 'POST to this endpoint to process orders into trades'
    });
    
  } catch (error) {
    console.error('Error in GET /api/trades/process:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}