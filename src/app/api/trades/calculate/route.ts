import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth0';
import { processUserOrders } from '@/lib/tradeBuilder';
import { tradesRepo } from '@/lib/repositories/tradesRepo';

export async function POST() {
  try {
    const user = await requireAuth();
    
    // Run trade calculation using the newer tradeBuilder system
    const calculatedTrades = await processUserOrders(user.id);

    return NextResponse.json({
      success: true,
      tradesCalculated: calculatedTrades.length,
      trades: calculatedTrades,
    });
  } catch (error) {
    console.error('Trade calculation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate trades' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    
    // Get calculated trades for display using the newer repository
    const trades = await tradesRepo.getAllCalculatedTrades(user.id);

    return NextResponse.json({
      success: true,
      trades,
    });
  } catch (error) {
    console.error('Error fetching calculated trades:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calculated trades' },
      { status: 500 }
    );
  }
}