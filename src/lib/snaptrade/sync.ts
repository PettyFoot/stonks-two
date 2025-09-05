import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from './client';
import { getDecryptedSecret, getBrokerConnection } from './auth';
import { prisma } from '@/lib/prisma';
import { SyncRequest, SyncResult, SnapTradeActivity } from './types';
import { mapSnapTradeActivityToTrade } from './mapper';
import { ConnectionStatus, SyncStatus, SyncType, ImportSource } from '@prisma/client';

/**
 * Sync trades from SnapTrade for a specific broker connection
 */
export async function syncTradesForConnection(
  request: SyncRequest
): Promise<SyncResult> {
  const syncLog = await prisma.syncLog.create({
    data: {
      userId: request.userId,
      brokerConnectionId: request.connectionId,
      syncType: request.syncType || SyncType.MANUAL,
      status: SyncStatus.PENDING,
    },
  });

  try {
    // Update sync log to running
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: SyncStatus.RUNNING },
    });

    // Get the broker connection
    const connection = await getBrokerConnection(request.connectionId, request.userId);
    if (!connection) {
      throw new Error('Broker connection not found');
    }

    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new Error('Broker connection is not active');
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();
    const decryptedSecret = getDecryptedSecret(connection.snapTradeUserSecret);

    // Get accounts for this connection
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: connection.snapTradeUserId,
      userSecret: decryptedSecret,
    });

    const accounts = accountsResponse.data || [];
    let totalTradesImported = 0;
    let totalTradesUpdated = 0;
    let totalTradesSkipped = 0;
    const errors: string[] = [];

    // Sync activities for each account
    for (const account of accounts) {
      try {
        // Get activities (trades) for this account
        const startDate = connection.lastSyncAt 
          ? new Date(connection.lastSyncAt.getTime() - 24 * 60 * 60 * 1000) // Go back 1 day for overlap
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago

        await RateLimitHelper.checkRateLimit();
        
        // Get account activities for this account
        const activitiesResponse = await client.accountInformation.getAccountActivities({
          userId: connection.snapTradeUserId,
          userSecret: decryptedSecret,
          accountId: account.id,
          startDate: startDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
        });

        const activitiesData = activitiesResponse.data;
        const activities: SnapTradeActivity[] = (activitiesData && 'activities' in activitiesData) 
          ? (activitiesData.activities || []) 
          : [];
        
        // Filter for trade activities
        const tradeActivities = activities.filter((activity: SnapTradeActivity) => 
          ['BUY', 'SELL', 'DIV', 'INT'].includes(activity.type?.toUpperCase() || '')
        );

        // Process each trade activity
        for (const activity of tradeActivities) {
          try {
            const result = await processTradeActivity(
              activity,
              request.userId,
              request.connectionId,
              account.id
            );

            if (result.imported) totalTradesImported++;
            else if (result.updated) totalTradesUpdated++;
            else totalTradesSkipped++;

          } catch (error) {
            const errorMsg = `Failed to process activity ${activity.id}: ${handleSnapTradeError(error)}`;
            errors.push(errorMsg);
            console.error(errorMsg, error);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to sync account ${account.id}: ${handleSnapTradeError(error)}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    // Update connection last sync time
    await prisma.brokerConnection.update({
      where: { id: request.connectionId },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: errors.length > 0 ? errors[0] : null,
        status: errors.length > 0 ? ConnectionStatus.ERROR : ConnectionStatus.ACTIVE,
      },
    });

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.COMPLETED,
        tradesImported: totalTradesImported,
        tradesUpdated: totalTradesUpdated,
        tradesSkipped: totalTradesSkipped,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });

    return {
      tradesImported: totalTradesImported,
      tradesUpdated: totalTradesUpdated,
      tradesSkipped: totalTradesSkipped,
      errors,
      success: errors.length === 0,
    };

  } catch (error) {
    const errorMsg = handleSnapTradeError(error);
    
    // Update sync log with error
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        errorCount: 1,
        errors: [errorMsg],
        completedAt: new Date(),
      },
    });

    // Update connection status
    await prisma.brokerConnection.update({
      where: { id: request.connectionId },
      data: {
        status: ConnectionStatus.ERROR,
        lastSyncError: errorMsg,
      },
    });

    throw new Error(errorMsg);
  }
}

/**
 * Process a single trade activity from SnapTrade
 */
async function processTradeActivity(
  activity: SnapTradeActivity,
  userId: string,
  connectionId: string,
  accountId: string
): Promise<{ imported: boolean; updated: boolean }> {
  // Check if this trade already exists
  const existingTrade = await prisma.trade.findFirst({
    where: {
      userId,
      snapTradeId: activity.id,
    },
  });

  if (existingTrade) {
    // Trade already exists, skip it
    return { imported: false, updated: false };
  }

  // Map SnapTrade activity to our trade format
  const tradeData = mapSnapTradeActivityToTrade(activity, userId, connectionId, accountId);

  // Separate the order data from trade data
  const { orderData, ...cleanTradeData } = tradeData;

  // Create the trade
  const trade = await prisma.trade.create({
    data: {
      ...cleanTradeData,
      importSource: ImportSource.SNAPTRADE_API,
      snapTradeId: activity.id,
      brokerConnectionId: connectionId,
    },
  });

  // Create the corresponding order if order data exists
  if (orderData) {
    await prisma.order.create({
      data: {
        ...orderData,
        userId,
        tradeId: trade.id,
        importBatchId: connectionId, // Use connection ID as import batch reference
      },
    });
  }

  return { imported: true, updated: false };
}

/**
 * Get sync history for a broker connection
 */
export async function getSyncHistory(connectionId: string, userId: string, limit = 10) {
  return prisma.syncLog.findMany({
    where: {
      brokerConnectionId: connectionId,
      userId,
    },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

/**
 * Get latest sync status for a connection
 */
export async function getLatestSyncStatus(connectionId: string, userId: string) {
  return prisma.syncLog.findFirst({
    where: {
      brokerConnectionId: connectionId,
      userId,
    },
    orderBy: { startedAt: 'desc' },
  });
}

/**
 * Sync all active connections for a user (for background jobs)
 */
export async function syncAllConnectionsForUser(userId: string): Promise<SyncResult[]> {
  const connections = await prisma.brokerConnection.findMany({
    where: {
      userId,
      status: ConnectionStatus.ACTIVE,
      autoSyncEnabled: true,
    },
  });

  const results: SyncResult[] = [];

  for (const connection of connections) {
    try {
      const result = await syncTradesForConnection({
        connectionId: connection.id,
        userId,
        syncType: SyncType.AUTOMATIC,
      });
      results.push(result);
    } catch (error) {
      console.error(`Failed to sync connection ${connection.id}:`, error);
      results.push({
        tradesImported: 0,
        tradesUpdated: 0,
        tradesSkipped: 0,
        errors: [handleSnapTradeError(error)],
        success: false,
      });
    }
  }

  return results;
}

/**
 * Update connection sync settings
 */
export async function updateSyncSettings(
  connectionId: string,
  userId: string,
  settings: {
    autoSyncEnabled?: boolean;
    syncInterval?: number;
  }
) {
  return prisma.brokerConnection.update({
    where: {
      id: connectionId,
      userId,
    },
    data: {
      ...settings,
      updatedAt: new Date(),
    },
  });
}