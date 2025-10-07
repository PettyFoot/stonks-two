import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth0';
import { tradesRepo } from '@/lib/repositories/tradesRepo';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tradeIds } = body;

    // Validate input
    if (!Array.isArray(tradeIds) || tradeIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: tradeIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate deletion (check for shared orders)
    const validation = await tradesRepo.validateDeletion(user.id, tradeIds);

    if (!validation.canDelete) {
      return NextResponse.json(
        {
          error: validation.error,
          sharedOrderCount: validation.sharedOrderCount,
          affectedTrades: validation.affectedTrades,
        },
        { status: 409 } // Conflict
      );
    }

    // Perform deletion
    const result = await tradesRepo.deleteTrades(user.id, tradeIds);

    return NextResponse.json({
      success: true,
      tradesDeleted: result.tradesDeleted,
      ordersDeleted: result.ordersDeleted,
    });

  } catch (error) {
    console.error('Delete trades error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete trades',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
