import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from './client';
import { prisma } from '@/lib/prisma';
import { SyncRequest, SyncResult, SnapTradeActivity, ConnectionStatus, SyncStatus, SyncType } from './types';
import { mapSnapTradeActivityToTrade } from './mapper';
import { ImportSource } from '@prisma/client';

/**
 * Sync trades from SnapTrade for a specific broker connection
 */
export async function syncTradesForConnection(
  request: SyncRequest
): Promise<SyncResult> {
  const syncLog = await prisma.snapTradeSync.create({
    data: {
      userId: request.userId,
      connectionId: request.connectionId,
      syncType: request.syncType || SyncType.MANUAL,
      status: SyncStatus.PENDING,
    },
  });

  try {
    // Update sync log to running
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: { status: SyncStatus.RUNNING },
    });

    // Get the user's SnapTrade credentials
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        snapTradeUserId: true,
        snapTradeUserSecret: true,
      },
    });
    
    if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) {
      throw new Error('SnapTrade credentials not found for user');
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();
    const decryptedSecret = user.snapTradeUserSecret;

    // Get accounts for this connection
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: user.snapTradeUserId,
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
        // Get activities (trades) for this account (default to 30 days ago)
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        await RateLimitHelper.checkRateLimit();
        
        // Get account activities for this account
        const activitiesResponse = await client.accountInformation.getAccountActivities({
          userId: user.snapTradeUserId,
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

    // Note: Connection status updates removed since brokerConnection model no longer exists

    // Update sync log
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.COMPLETED,
        ordersCreated: totalTradesImported,
        activitiesFound: totalTradesImported + totalTradesUpdated + totalTradesSkipped,
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
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        errors: [errorMsg],
        completedAt: new Date(),
      },
    });

    // Note: Connection status updates removed since brokerConnection model no longer exists

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
  return prisma.snapTradeSync.findMany({
    where: {
      connectionId: connectionId,
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
  return prisma.snapTradeSync.findFirst({
    where: {
      connectionId: connectionId,
      userId,
    },
    orderBy: { startedAt: 'desc' },
  });
}

/**
 * Sync all active connections for a user (for background jobs)
 * Note: Simplified to work without brokerConnection model
 */
export async function syncAllConnectionsForUser(userId: string): Promise<SyncResult[]> {
  // Since we no longer have broker connections as separate entities,
  // this function would need to be refactored based on your specific use case
  // For now, returning empty array to prevent build errors
  console.warn('syncAllConnectionsForUser: Function needs refactoring after brokerConnection model removal');
  return [];
}

/**
 * Update connection sync settings
 * Note: Function removed since brokerConnection model no longer exists
 */
export async function updateSyncSettings(
  connectionId: string,
  userId: string,
  settings: {
    autoSyncEnabled?: boolean;
    syncInterval?: number;
  }
) {
  console.warn('updateSyncSettings: Function not implemented after brokerConnection model removal');
  throw new Error('Function not available: brokerConnection model was removed');
}