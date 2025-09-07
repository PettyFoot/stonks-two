import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { syncTradesForConnection, getSyncHistory } from '@/lib/snaptrade';
import { SyncType } from '@/lib/snaptrade/types';
import { z } from 'zod';

const SyncRequestSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  syncType: z.enum(['MANUAL', 'AUTOMATIC', 'WEBHOOK']).optional().default('MANUAL'),
});

// POST - Trigger manual sync
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId, syncType } = SyncRequestSchema.parse(body);

    // Start sync operation
    const result = await syncTradesForConnection({
      connectionId,
      userId: session.user.sub,
      syncType: syncType as SyncType,
    });

    return NextResponse.json({
      success: result.success,
      tradesImported: result.tradesImported,
      tradesUpdated: result.tradesUpdated,
      tradesSkipped: result.tradesSkipped,
      errors: result.errors,
      errorCount: result.errors.length,
    });

  } catch (error) {
    console.error('Error syncing trades:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync trades',
        success: false,
        tradesImported: 0,
        tradesUpdated: 0,
        tradesSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        errorCount: 1,
      },
      { status: 500 }
    );
  }
}

// GET - Get sync history for a connection
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const syncHistory = await getSyncHistory(connectionId, session.user.sub, limit);

    return NextResponse.json({
      success: true,
      syncHistory,
      count: syncHistory.length,
    });

  } catch (error) {
    console.error('Error fetching sync history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync history' },
      { status: 500 }
    );
  }
}