import { NextRequest, NextResponse } from 'next/server';
import { syncAllConnectionsForUser } from '@/lib/snaptrade/sync';
import { prisma } from '@/lib/prisma';

interface WebhookPayload {
  webhookId?: string;
  userId?: string;
  eventType?: string;
  type?: string;
  eventTimestamp?: string;
  clientId?: string;
  webhookSecret?: string;
  data?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookSecret = process.env.SNAPTRADE_WEBHOOK_SECRET;







    if (!webhookSecret) {
      console.error('SNAPTRADE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      );
    }

    // Parse webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }







    
    // Validate webhook authenticity using webhookSecret field in payload
    if (!payload.webhookSecret) {
      console.error('No webhookSecret found in payload');
      return NextResponse.json(
        { error: 'Missing webhook secret' },
        { status: 401 }
      );
    }

    if (payload.webhookSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    const eventType = payload.eventType || payload.type;
    const snapTradeUserId = payload.userId;

    if (!snapTradeUserId) {
      console.error('No userId provided in webhook payload');
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Find user by SnapTrade user ID
    const user = await prisma.user.findFirst({
      where: { snapTradeUserId }
    });

    if (!user) {
      console.error(`No user found for SnapTrade userId: ${snapTradeUserId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }



    // Handle different webhook types
    switch (eventType) {
      case 'connection.disconnected':
      case 'CONNECTION_DISCONNECTED':

        
        // Clear SnapTrade data from user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            snapTradeUserId: null,
            snapTradeUserSecret: null,
            snapTradeRegisteredAt: null
          }
        });


        break;

      case 'trades.placed':
      case 'TRADES_PLACED':

        
        // Trigger sync for this user
        try {
          const syncResults = await syncAllConnectionsForUser(user.id);

        } catch (syncError) {
          console.error(`Failed to sync trades for user ${user.id}:`, syncError);
          // Don't fail the webhook for sync errors
        }
        break;

      case 'connection.established':
      case 'CONNECTION_ESTABLISHED':

        
        // Connection is already established via the redirect flow
        // Just log this event
        break;

      default:

    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      eventType,
      userId: user.id
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Disable caching for webhook endpoints
export const dynamic = 'force-dynamic';
export const revalidate = 0;