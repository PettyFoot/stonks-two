import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth0';
import { tradeCalculationService } from '@/services/tradeCalculation';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Get optional importBatchId from request body
    const body = await request.json().catch(() => ({}));
    const { importBatchId } = body;

    // Run trade calculation
    const calculatedTrades = importBatchId 
      ? await tradeCalculationService.recalculateForImportBatch(user.id, importBatchId)
      : await tradeCalculationService.buildTrades(user.id);

    return NextResponse.json({
      success: true,
      tradesCalculated: calculatedTrades.length,
      trades: calculatedTrades,
    });
  } catch (error) {
    console.error('Trade calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trades' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    
    // Get calculated trades for display
    const trades = await tradeCalculationService.getCalculatedTrades(user.id);

    return NextResponse.json({
      success: true,
      trades,
    });
  } catch (error) {
    console.error('Error fetching calculated trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calculated trades' },
      { status: 500 }
    );
  }
}