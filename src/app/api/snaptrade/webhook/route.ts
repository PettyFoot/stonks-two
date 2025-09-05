import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature, syncTradesForConnection } from '@/lib/snaptrade';
import { prisma } from '@/lib/prisma';
import { WebhookPayload } from '@/lib/snaptrade/types';
import { SyncType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-snaptrade-signature') || '';
    const webhookSecret = process.env.SNAPTRADE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('SNAPTRADE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      );
    }

    // Validate webhook signature
    if (!validateWebhookSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = JSON.parse(body);
    console.log('Received SnapTrade webhook:', payload.type);

    // Handle different webhook types
    switch (payload.type) {
      case 'ACCOUNT_UPDATED':
      case 'TRADES_UPDATED':
      case 'POSITIONS_UPDATED':
        await handleTradesUpdatedWebhook(payload);
        break;
      
      case 'CONNECTION_BROKEN':
        await handleConnectionBrokenWebhook(payload);
        break;
      
      default:
        console.log('Unhandled webhook type:', payload.type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing SnapTrade webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleTradesUpdatedWebhook(payload: WebhookPayload) {
  try {
    // Find the broker connection by SnapTrade user ID
    const connection = await prisma.brokerConnection.findFirst({
      where: {
        snapTradeUserId: payload.data.user_id,
      },
    });

    if (!connection) {
      console.warn('No connection found for SnapTrade user:', payload.data.user_id);
      return;
    }

    // Trigger sync for this connection
    console.log('Triggering webhook sync for connection:', connection.id);
    
    await syncTradesForConnection({
      connectionId: connection.id,
      userId: connection.userId,
      syncType: SyncType.WEBHOOK,
    });

    console.log('Webhook sync completed for connection:', connection.id);

  } catch (error) {
    console.error('Error handling trades updated webhook:', error);
    
    // Update connection status to indicate error
    if (payload.data.user_id) {
      await prisma.brokerConnection.updateMany({
        where: { snapTradeUserId: payload.data.user_id },
        data: {
          status: 'ERROR',
          lastSyncError: 'Webhook sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        },
      });
    }
  }
}

async function handleConnectionBrokenWebhook(payload: WebhookPayload) {
  try {
    // Mark connection as inactive
    const updated = await prisma.brokerConnection.updateMany({
      where: {
        snapTradeUserId: payload.data.user_id,
      },
      data: {
        status: 'ERROR',
        lastSyncError: 'Connection broken - requires re-authentication',
      },
    });

    if (updated.count > 0) {
      console.log('Marked connection as broken for SnapTrade user:', payload.data.user_id);
    } else {
      console.warn('No connection found to mark as broken for SnapTrade user:', payload.data.user_id);
    }

  } catch (error) {
    console.error('Error handling connection broken webhook:', error);
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhookConfigured: !!process.env.SNAPTRADE_WEBHOOK_SECRET,
  });
}