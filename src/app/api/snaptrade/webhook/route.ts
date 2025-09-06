import { NextRequest, NextResponse } from 'next/server';
import { syncTradesForConnection } from '@/lib/snaptrade';
import { prisma } from '@/lib/prisma';
import { WebhookPayload, ConnectionAttemptedWebhookData, AccountWebhookData, TradesPlacedWebhookData } from '@/lib/snaptrade/types';
import { SyncType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookSecret = process.env.SNAPTRADE_WEBHOOK_SECRET;

    console.log('=== SnapTrade Webhook Debug ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    console.log('Body length:', body.length);
    console.log('Webhook secret configured:', !!webhookSecret);

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

    console.log('Received SnapTrade webhook:', payload.eventType || payload.type);
    console.log('Webhook ID:', payload.webhookId);
    console.log('User ID:', payload.userId);
    console.log('Client ID:', payload.clientId);
    console.log('Event Timestamp:', payload.eventTimestamp);
    console.log('Payload data:', payload.data ? JSON.stringify(payload.data, null, 2) : 'No data');
    
    // Validate webhook authenticity using webhookSecret field in payload
    if (!payload.webhookSecret) {
      console.error('No webhookSecret found in payload');
      return NextResponse.json(
        { error: 'Missing webhook secret' },
        { status: 401 }
      );
    }

    if (payload.webhookSecret !== webhookSecret) {
      console.error('Invalid webhook secret in payload. Expected:', webhookSecret, 'Received:', payload.webhookSecret);
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    console.log('Webhook authentication successful');

    // Handle different webhook types - support both new eventType and legacy type fields
    const eventType = payload.eventType || payload.type;
    console.log('Processing event type:', eventType);
    
    switch (eventType) {
      // User lifecycle events
      case 'USER_REGISTERED':
        await handleUserRegisteredWebhook(payload);
        break;
      
      case 'USER_DELETED':
        await handleUserDeletedWebhook(payload);
        break;
      
      // Connection lifecycle events
      case 'CONNECTION_ATTEMPTED':
        await handleConnectionAttemptedWebhook(payload as ConnectionAttemptedWebhookData);
        break;
      
      case 'CONNECTION_ADDED':
      case 'CONNECTION_UPDATED':
      case 'CONNECTION_FIXED':
        await handleConnectionAddedWebhook(payload);
        break;
      
      case 'CONNECTION_BROKEN':
      case 'CONNECTION_REMOVED':
      case 'CONNECTION_DELETED':
      case 'CONNECTION_FAILED':
        await handleConnectionBrokenWebhook(payload);
        break;
      
      // Account and transaction events
      case 'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE':
      case 'ACCOUNT_TRANSACTIONS_UPDATED':
        await handleAccountTransactionsWebhook(payload as AccountWebhookData);
        break;
      
      case 'ACCOUNT_HOLDINGS_UPDATED':
        await handleAccountHoldingsWebhook(payload as AccountWebhookData);
        break;
      
      case 'ACCOUNT_REMOVED':
        await handleAccountRemovedWebhook(payload);
        break;
      
      case 'NEW_ACCOUNT_AVAILABLE':
        await handleNewAccountAvailableWebhook(payload);
        break;
      
      // Trading events
      case 'TRADES_PLACED':
        await handleTradesPlacedWebhook(payload as TradesPlacedWebhookData);
        break;
      
      // Legacy events - still supported
      case 'ACCOUNT_UPDATED':
      case 'TRADES_UPDATED':
      case 'POSITIONS_UPDATED':
        await handleTradesUpdatedWebhook(payload);
        break;
      
      default:
        console.log('Unhandled webhook type:', eventType);
        // Log the payload for debugging unknown events
        console.log('Unknown event payload:', JSON.stringify(payload, null, 2));
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

// User lifecycle event handlers
async function handleUserRegisteredWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing USER_REGISTERED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in user registered webhook payload');
      return;
    }

    // Find the user by snapTradeUserId
    const user = await prisma.user.findFirst({
      where: { snapTradeUserId: snapTradeUserId }
    });

    if (user) {
      console.log('USER_REGISTERED webhook received for existing user:', user.auth0Id);
    } else {
      console.warn('USER_REGISTERED webhook received for unknown SnapTrade user:', snapTradeUserId);
    }
  } catch (error) {
    console.error('Error handling user registered webhook:', error);
  }
}

async function handleUserDeletedWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing USER_DELETED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in user deleted webhook payload');
      return;
    }

    // Clean up any remaining connections for this user
    const deletedCount = await prisma.brokerConnection.deleteMany({
      where: { snapTradeUserId: snapTradeUserId },
    });

    if (deletedCount.count > 0) {
      console.log('Cleaned up', deletedCount.count, 'connections for deleted SnapTrade user:', snapTradeUserId);
    }
  } catch (error) {
    console.error('Error handling user deleted webhook:', error);
  }
}

// Connection lifecycle event handlers
async function handleConnectionAttemptedWebhook(payload: ConnectionAttemptedWebhookData) {
  try {
    console.log('Processing CONNECTION_ATTEMPTED webhook for user:', payload.userId);
    console.log('Connection attempt result:', payload.data?.result);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in connection attempted webhook payload');
      return;
    }

    // Find the user by snapTradeUserId first
    const user = await prisma.user.findFirst({
      where: { snapTradeUserId: snapTradeUserId }
    });

    if (!user) {
      console.error('No user found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Update connection status based on attempt result
    if (payload.data?.result === 'SUCCESS') {
      await prisma.brokerConnection.updateMany({
        where: { 
          userId: user.auth0Id,
          snapTradeUserId: snapTradeUserId 
        },
        data: {
          status: 'ACTIVE',
          lastSyncError: null,
        },
      });
    } else if (payload.data?.result) {
      await prisma.brokerConnection.updateMany({
        where: { 
          userId: user.auth0Id,
          snapTradeUserId: snapTradeUserId 
        },
        data: {
          status: 'ERROR',
          lastSyncError: `Connection attempt failed: ${payload.data.result}${payload.data.error ? ` - ${payload.data.error}` : ''}`,
        },
      });
    }
  } catch (error) {
    console.error('Error handling connection attempted webhook:', error);
  }
}

async function handleConnectionAddedWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing CONNECTION_ADDED/UPDATED/FIXED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in connection added webhook payload');
      return;
    }

    // Find the user by snapTradeUserId first
    const user = await prisma.user.findFirst({
      where: { snapTradeUserId: snapTradeUserId }
    });

    if (!user) {
      console.error('No user found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Find and update the connection status
    const updated = await prisma.brokerConnection.updateMany({
      where: { 
        userId: user.auth0Id,
        snapTradeUserId: snapTradeUserId 
      },
      data: {
        status: 'ACTIVE',
        lastSyncError: null,
      },
    });

    if (updated.count > 0) {
      console.log('Updated connection status to ACTIVE for SnapTrade user:', snapTradeUserId);
      
      // Trigger a sync for the connection
      const connection = await prisma.brokerConnection.findFirst({
        where: { 
          userId: user.auth0Id,
          snapTradeUserId: snapTradeUserId 
        },
      });
      
      if (connection) {
        await syncTradesForConnection({
          connectionId: connection.id,
          userId: connection.userId,
          syncType: SyncType.WEBHOOK,
        });
        console.log('Triggered sync for connection:', connection.id);
      }
    } else {
      console.log('No existing connection found to update, this may be the first connection attempt');
    }
  } catch (error) {
    console.error('Error handling connection added webhook:', error);
  }
}

async function handleConnectionBrokenWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing CONNECTION_BROKEN/REMOVED/DELETED/FAILED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in connection broken webhook payload');
      return;
    }

    // Find the user by snapTradeUserId first
    const user = await prisma.user.findFirst({
      where: { snapTradeUserId: snapTradeUserId }
    });

    if (!user) {
      console.error('No user found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Mark connection as inactive
    const updated = await prisma.brokerConnection.updateMany({
      where: { 
        userId: user.auth0Id,
        snapTradeUserId: snapTradeUserId 
      },
      data: {
        status: 'ERROR',
        lastSyncError: `Connection ${payload.eventType.toLowerCase()} - requires re-authentication`,
      },
    });

    if (updated.count > 0) {
      console.log('Marked connection as broken for SnapTrade user:', snapTradeUserId);
    } else {
      console.warn('No connection found to mark as broken for SnapTrade user:', snapTradeUserId);
    }
  } catch (error) {
    console.error('Error handling connection broken webhook:', error);
  }
}

// Account and transaction event handlers
async function handleAccountTransactionsWebhook(payload: AccountWebhookData) {
  try {
    console.log('Processing ACCOUNT_TRANSACTIONS webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in account transactions webhook payload');
      return;
    }

    // Find the user by snapTradeUserId first
    const user = await prisma.user.findFirst({
      where: { snapTradeUserId: snapTradeUserId }
    });

    if (!user) {
      console.error('No user found for SnapTrade user:', snapTradeUserId);
      return;
    }

    const connection = await prisma.brokerConnection.findFirst({
      where: { 
        userId: user.auth0Id,
        snapTradeUserId: snapTradeUserId 
      },
    });

    if (!connection) {
      console.warn('No connection found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Trigger sync for this connection
    console.log('Triggering transaction sync for connection:', connection.id);
    
    await syncTradesForConnection({
      connectionId: connection.id,
      userId: connection.userId,
      syncType: SyncType.WEBHOOK,
    });

    console.log('Transaction sync completed for connection:', connection.id);
  } catch (error) {
    console.error('Error handling account transactions webhook:', error);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (snapTradeUserId) {
      // Find user first, then update connection
      const user = await prisma.user.findFirst({
        where: { snapTradeUserId: snapTradeUserId }
      });
      
      if (user) {
        await prisma.brokerConnection.updateMany({
          where: { 
            userId: user.auth0Id,
            snapTradeUserId: snapTradeUserId 
          },
          data: {
            status: 'ERROR',
            lastSyncError: 'Transaction webhook sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          },
        });
      }
    }
  }
}

async function handleAccountHoldingsWebhook(payload: AccountWebhookData) {
  try {
    console.log('Processing ACCOUNT_HOLDINGS_UPDATED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in account holdings webhook payload');
      return;
    }

    const connection = await prisma.brokerConnection.findFirst({
      where: { snapTradeUserId: snapTradeUserId },
    });

    if (!connection) {
      console.warn('No connection found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Trigger sync for holdings update
    console.log('Triggering holdings sync for connection:', connection.id);
    
    await syncTradesForConnection({
      connectionId: connection.id,
      userId: connection.userId,
      syncType: SyncType.WEBHOOK,
    });

    console.log('Holdings sync completed for connection:', connection.id);
  } catch (error) {
    console.error('Error handling account holdings webhook:', error);
  }
}

async function handleAccountRemovedWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing ACCOUNT_REMOVED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    const accountId = payload.data?.account_id;
    
    if (!snapTradeUserId) {
      console.error('No user ID found in account removed webhook payload');
      return;
    }

    // Update connection status
    await prisma.brokerConnection.updateMany({
      where: { 
        snapTradeUserId: snapTradeUserId,
        ...(accountId && { accountId: accountId })
      },
      data: {
        status: 'ERROR',
        lastSyncError: 'Account removed from connection',
      },
    });

    console.log('Updated connection status for removed account:', accountId);
  } catch (error) {
    console.error('Error handling account removed webhook:', error);
  }
}

async function handleNewAccountAvailableWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing NEW_ACCOUNT_AVAILABLE webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in new account webhook payload');
      return;
    }

    const connection = await prisma.brokerConnection.findFirst({
      where: { snapTradeUserId: snapTradeUserId },
    });

    if (!connection) {
      console.warn('No connection found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Trigger sync to pick up the new account
    await syncTradesForConnection({
      connectionId: connection.id,
      userId: connection.userId,
      syncType: SyncType.WEBHOOK,
    });

    console.log('Sync triggered for new account availability');
  } catch (error) {
    console.error('Error handling new account webhook:', error);
  }
}

// Trading event handlers
async function handleTradesPlacedWebhook(payload: TradesPlacedWebhookData) {
  try {
    console.log('Processing TRADES_PLACED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in trades placed webhook payload');
      return;
    }

    const connection = await prisma.brokerConnection.findFirst({
      where: { snapTradeUserId: snapTradeUserId },
    });

    if (!connection) {
      console.warn('No connection found for SnapTrade user:', snapTradeUserId);
      return;
    }

    // Trigger immediate sync for new trades
    console.log('Triggering immediate sync for new trades');
    
    await syncTradesForConnection({
      connectionId: connection.id,
      userId: connection.userId,
      syncType: SyncType.WEBHOOK,
    });

    console.log('Trade sync completed for connection:', connection.id);
  } catch (error) {
    console.error('Error handling trades placed webhook:', error);
  }
}

// Legacy webhook handlers (keeping for backward compatibility)
async function handleTradesUpdatedWebhook(payload: WebhookPayload) {
  try {
    console.log('Processing legacy TRADES_UPDATED webhook for user:', payload.userId);
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (!snapTradeUserId) {
      console.error('No user ID found in webhook payload');
      return;
    }

    const connection = await prisma.brokerConnection.findFirst({
      where: { snapTradeUserId: snapTradeUserId },
    });

    if (!connection) {
      console.warn('No connection found for SnapTrade user:', snapTradeUserId);
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
    
    const snapTradeUserId = payload.userId || payload.data?.user_id;
    if (snapTradeUserId) {
      await prisma.brokerConnection.updateMany({
        where: { snapTradeUserId: snapTradeUserId },
        data: {
          status: 'ERROR',
          lastSyncError: 'Webhook sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        },
      });
    }
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    webhookConfigured: !!process.env.SNAPTRADE_WEBHOOK_SECRET,
    snapTradeConfigured: !!(process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY),
    clientId: process.env.SNAPTRADE_CLIENT_ID || 'Not configured',
    supportedEventTypes: [
      'USER_REGISTERED',
      'USER_DELETED',
      'CONNECTION_ATTEMPTED',
      'CONNECTION_ADDED',
      'CONNECTION_DELETED',
      'CONNECTION_BROKEN',
      'CONNECTION_FIXED',
      'CONNECTION_UPDATED',
      'CONNECTION_FAILED',
      'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE',
      'ACCOUNT_TRANSACTIONS_UPDATED',
      'ACCOUNT_REMOVED',
      'ACCOUNT_HOLDINGS_UPDATED',
      'TRADES_PLACED',
      'NEW_ACCOUNT_AVAILABLE',
      // Legacy support
      'ACCOUNT_UPDATED',
      'TRADES_UPDATED',
      'POSITIONS_UPDATED',
      'CONNECTION_REMOVED',
    ],
  });
}