// Main exports for the SnapTrade integration
export * from './types';
export * from './client';
export * from './auth';
export * from './sync';
export * from './mapper';

// Re-export commonly used functions
export {
  initializeSnapTrade,
  getSnapTradeClient,
  isSnapTradeConfigured,
  handleSnapTradeError,
  RateLimitHelper,
} from './client';

export {
  createBrokerConnection,
  completeBrokerAuth,
  getDecryptedSecret,
  getSnapTradeCredentials,
  validateWebhookSignature,
  getSnapTradeBrokerConnections,
  deleteSnapTradeUser,
} from './auth';

export {
  syncTradesForConnection,
  getSyncHistory,
  getLatestSyncStatus,
  syncAllConnectionsForUser,
  updateSyncSettings,
} from './sync';

export {
  mapSnapTradeActivityToTrade,
  mapBrokerType,
  validateSnapTradeActivity,
  extractTradeMetadata,
  parseSnapTradeDate,
  formatTradeForBulkInsert,
} from './mapper';