import { ConnectionStatus, SyncStatus, SyncType } from '@prisma/client';

export interface SnapTradeConfig {
  clientId: string;
  consumerKey: string;
  webhookSecret?: string;
  baseUrl?: string;
}

export interface BrokerConnectionData {
  id: string;
  userId: string;
  snapTradeUserId: string;
  brokerName: string;
  accountId?: string;
  accountName?: string;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  lastSyncError?: string;
  autoSyncEnabled: boolean;
  syncInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncResult {
  tradesImported: number;
  tradesUpdated: number;
  tradesSkipped: number;
  errors: string[];
  success: boolean;
}

export interface CreateConnectionRequest {
  userId: string;
  redirectUri: string;
  broker?: string;
}

export interface CreateConnectionResponse {
  redirectUri: string;
  snapTradeUserId: string;
  snapTradeUserSecret: string;
}

export interface AuthCompleteRequest {
  userId: string;
  brokerAuthorizationCode: string;
  snapTradeUserId: string;
  snapTradeUserSecret: string;
}

export interface AuthCompleteResponse {
  success: boolean;
  brokerConnection?: BrokerConnectionData;
  error?: string;
}

export interface SyncRequest {
  connectionId: string;
  userId: string;
  syncType?: SyncType;
}

export interface DisconnectRequest {
  connectionId: string;
  userId: string;
}

export interface ListConnectionsResponse {
  connections: BrokerConnectionData[];
  totalCount: number;
}

export interface SyncLogData {
  id: string;
  userId: string;
  brokerConnectionId: string;
  syncType: SyncType;
  status: SyncStatus;
  tradesImported: number;
  tradesUpdated: number;
  tradesSkipped: number;
  errorCount: number;
  errors?: any;
  startedAt: Date;
  completedAt?: Date;
}

// SnapTrade API response types
export interface SnapTradeAccount {
  id: string;
  number: string;
  name: string;
  brokerage_authorization: {
    id: string;
    type: string;
    name: string;
  };
  portfolio_group: {
    id: string;
    name: string;
  };
}

export interface SnapTradeActivity {
  id: string;
  account: {
    id: string;
    number: string;
    name: string;
  };
  symbol: {
    id: string;
    symbol: string;
    description: string;
    currency: {
      id: string;
      code: string;
      name: string;
    };
    exchange: {
      id: string;
      code: string;
      name: string;
    };
  };
  trade_date: string;
  settlement_date: string;
  type: string;
  description: string;
  quantity: number;
  price: number;
  currency: {
    id: string;
    code: string;
    name: string;
  };
  fx_rate: number;
  institution: string;
  option_type?: string;
  option_strike_price?: number;
  option_expiration_date?: string;
}

export interface SnapTradeErrorResponse {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

export interface WebhookPayload {
  webhookId: string;
  clientId: string;
  eventTimestamp: string;
  userId: string;
  eventType: 
    | 'USER_REGISTERED'
    | 'USER_DELETED'
    | 'CONNECTION_ATTEMPTED'
    | 'CONNECTION_ADDED'
    | 'CONNECTION_DELETED'
    | 'CONNECTION_BROKEN'
    | 'CONNECTION_FIXED'
    | 'CONNECTION_UPDATED'
    | 'CONNECTION_FAILED'
    | 'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE'
    | 'ACCOUNT_TRANSACTIONS_UPDATED'
    | 'ACCOUNT_REMOVED'
    | 'ACCOUNT_HOLDINGS_UPDATED'
    | 'TRADES_PLACED'
    | 'NEW_ACCOUNT_AVAILABLE'
    // Legacy support
    | 'ACCOUNT_UPDATED'
    | 'TRADES_UPDATED'
    | 'POSITIONS_UPDATED'
    | 'CONNECTION_REMOVED';
  webhookSecret: string;
  type?: string; // legacy support
  data?: {
    user_id: string;
    user_secret?: string;
    brokerage_authorization_id?: string;
    account_id?: string;
    activities?: SnapTradeActivity[];
    result?: string; // For CONNECTION_ATTEMPTED events
    error?: string;
    success?: boolean;
    accounts?: SnapTradeAccount[];
    holdings?: any[];
    trades?: any[];
  };
}

export interface ConnectionAttemptedWebhookData extends WebhookPayload {
  eventType: 'CONNECTION_ATTEMPTED';
  data: {
    user_id: string;
    brokerage_authorization_id?: string;
    result: 'SUCCESS' | 'AUTH_EXPIRED' | 'INVALID_AUTH_CODE' | 'CONNECTION_FAILED' | 'UNKNOWN_ERROR';
    error?: string;
  };
}

export interface AccountWebhookData extends WebhookPayload {
  eventType: 'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE' | 'ACCOUNT_TRANSACTIONS_UPDATED' | 'ACCOUNT_HOLDINGS_UPDATED';
  data: {
    user_id: string;
    account_id: string;
    brokerage_authorization_id: string;
    success?: boolean;
    error?: string;
  };
}

export interface TradesPlacedWebhookData extends WebhookPayload {
  eventType: 'TRADES_PLACED';
  data: {
    user_id: string;
    account_id: string;
    brokerage_authorization_id: string;
    trades?: any[];
  };
}