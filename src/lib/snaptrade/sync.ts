import { handleSnapTradeError } from './client';
import { prisma } from '@/lib/prisma';
import { SyncRequest, SyncResult, SyncStatus, SyncType } from './types';
import { SnapTradeActivityProcessor } from './activityProcessor';

/**
 * Get sync configuration from database or create default
 */
async function getSyncConfig() {
  let config = await prisma.snapTradeSyncConfig.findFirst();

  if (!config) {
    // Create default config if none exists
    config = await prisma.snapTradeSyncConfig.create({
      data: {
        startDate: '2015-01-01',
        endDate: null, // Use current date
        limit: 500,
        activityTypes: 'BUY,SELL'
      }
    });
  }

  return config;
}

/**
 * Sync trades from SnapTrade for a specific broker connection
 * Now uses SnapTradeActivityProcessor for proper activity processing
 */
export async function syncTradesForConnection(
  request: SyncRequest
): Promise<SyncResult> {
  // Get sync configuration
  const config = await getSyncConfig();

  // Calculate date range
  const startDate = new Date(config.startDate);
  const endDate = config.endDate ? new Date(config.endDate) : new Date();

  const syncLog = await prisma.snapTradeSync.create({
    data: {
      userId: request.userId,
      connectionId: request.connectionId,
      syncType: request.syncType || SyncType.MANUAL,
      status: SyncStatus.PENDING,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    },
  });

  try {
    // Update sync log to running
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: { status: SyncStatus.RUNNING },
    });

    // Verify user has SnapTrade credentials
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

    // Use the SnapTradeActivityProcessor for proper processing
    const processor = new SnapTradeActivityProcessor();

    const result = await processor.processActivities(
      request.connectionId,
      request.userId,
      {
        dateFrom: startDate,
        dateTo: endDate,
        onProgress: (progress, message) => {
          console.log(`[SNAPTRADE_SYNC] ${request.userId}: ${progress}% - ${message}`);
        }
      }
    );

    // Get the created order IDs from the processor result
    const orderIds = result.createdOrderIds || [];

    // Update sync log with results
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: {
        status: result.success ? SyncStatus.COMPLETED : SyncStatus.FAILED,
        ordersCreated: result.ordersCreated,
        activitiesFound: result.activitiesFound,
        orderIds: orderIds,
        dataReturned: result.activitiesFound > 0,
        errors: result.errors.length > 0 ? result.errors : undefined,
        completedAt: new Date(),
      },
    });

    return {
      tradesImported: result.ordersCreated,
      tradesUpdated: 0, // ActivityProcessor doesn't track updates separately
      tradesSkipped: result.duplicatesSkipped,
      errors: result.errors,
      success: result.success,
    };

  } catch (error) {
    const errorMsg = handleSnapTradeError(error);

    // Update sync log with error
    await prisma.snapTradeSync.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        errors: [errorMsg],
        dataReturned: false,
        completedAt: new Date(),
      },
    });

    throw new Error(errorMsg);
  }
}


/**
 * Update sync configuration
 */
export async function updateSyncConfig(config: {
  startDate?: string;
  endDate?: string | null;
  limit?: number;
  activityTypes?: string;
}) {
  const existingConfig = await prisma.snapTradeSyncConfig.findFirst();

  if (!existingConfig) {
    // Create new config
    return await prisma.snapTradeSyncConfig.create({
      data: {
        startDate: config.startDate || '2015-01-01',
        endDate: config.endDate,
        limit: config.limit || 500,
        activityTypes: config.activityTypes || 'BUY,SELL'
      }
    });
  } else {
    // Update existing config
    return await prisma.snapTradeSyncConfig.update({
      where: { id: existingConfig.id },
      data: config
    });
  }
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