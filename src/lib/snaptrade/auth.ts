import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from './client';
import { prisma } from '@/lib/prisma';
import { 
  CreateConnectionRequest,
  CreateConnectionResponse,
  AuthCompleteRequest,
  AuthCompleteResponse,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Encryption helpers for storing SnapTrade user secrets
const ENCRYPTION_KEY = process.env.SNAPTRADE_ENCRYPTION_KEY || 'default-key-change-in-production';

function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Create a new SnapTrade user and get authorization URL
 */
export async function createBrokerConnection(
  request: CreateConnectionRequest
): Promise<CreateConnectionResponse> {
  try {
    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Generate unique SnapTrade user ID
    const snapTradeUserId = uuidv4();

    // Register user with SnapTrade
    const registerResponse = await client.authentication.registerSnapTradeUser({
      userId: snapTradeUserId,
    });

    // Get the userSecret from the registration response
    const snapTradeUserSecret = registerResponse.data.userSecret;

    if (!snapTradeUserSecret) {
      throw new Error('Failed to get user secret from SnapTrade registration');
    }

    // Get authorization URL from SnapTrade (simplified call first to get redirect)
    const authResponse = await client.authentication.loginSnapTradeUser({
      userId: snapTradeUserId,
      userSecret: snapTradeUserSecret,
    });

    // Extract redirect URI from response
    const loginResponse = authResponse.data as any;
    const redirectUri = loginResponse.redirectURI || loginResponse.redirectUri || loginResponse.redirectURL;
    
    console.log('SnapTrade login response:', loginResponse);

    if (!redirectUri) {
      throw new Error('Failed to get redirect URI from SnapTrade');
    }

    return {
      redirectUri,
      snapTradeUserId,
      snapTradeUserSecret,
    };
  } catch (error) {
    console.error('Error creating broker connection:', error);
    throw new Error(handleSnapTradeError(error));
  }
}

/**
 * Complete the broker authorization process
 */
export async function completeBrokerAuth(
  request: AuthCompleteRequest
): Promise<AuthCompleteResponse> {
  try {
    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Get all brokerage authorizations for this user
    const authorizationsResponse = await client.connections.listBrokerageAuthorizations({
      userId: request.snapTradeUserId,
      userSecret: request.snapTradeUserSecret,
    });

    const authorizations = authorizationsResponse.data;
    if (!authorizations || authorizations.length === 0) {
      throw new Error('No brokerage authorizations found after connection');
    }

    // Get the most recent authorization (last one in the list)
    const latestAuth = authorizations[authorizations.length - 1];
    
    console.log('Latest authorization:', latestAuth);

    // Get accounts for this authorization
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: request.snapTradeUserId,
      userSecret: request.snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];
    const primaryAccount = accounts[0]; // Use first account as primary

    const brokerAuth = {
      name: latestAuth.name || 'Connected Broker',
      id: latestAuth.id,
    };

    // Store the connection in our database
    const encryptedSecret = encrypt(request.snapTradeUserSecret);
    
    const brokerConnection = await prisma.brokerConnection.create({
      data: {
        userId: request.userId,
        snapTradeUserId: request.snapTradeUserId,
        snapTradeUserSecret: encryptedSecret,
        brokerName: brokerAuth.name || 'Unknown Broker',
        accountId: primaryAccount?.id || null,
        accountName: primaryAccount?.name || primaryAccount?.number || null,
        status: 'ACTIVE',
        autoSyncEnabled: true,
        syncInterval: 86400, // 24 hours
      },
    });

    return {
      success: true,
      brokerConnection: {
        id: brokerConnection.id,
        userId: brokerConnection.userId,
        snapTradeUserId: brokerConnection.snapTradeUserId,
        brokerName: brokerConnection.brokerName,
        accountId: brokerConnection.accountId || undefined,
        accountName: brokerConnection.accountName || undefined,
        status: brokerConnection.status,
        lastSyncAt: brokerConnection.lastSyncAt || undefined,
        lastSyncError: brokerConnection.lastSyncError || undefined,
        autoSyncEnabled: brokerConnection.autoSyncEnabled,
        syncInterval: brokerConnection.syncInterval,
        createdAt: brokerConnection.createdAt,
        updatedAt: brokerConnection.updatedAt,
      },
    };
  } catch (error) {
    console.error('Error completing broker auth:', error);
    return {
      success: false,
      error: handleSnapTradeError(error),
    };
  }
}

/**
 * Get decrypted user secret for API calls
 */
export function getDecryptedSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

/**
 * Validate SnapTrade webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * List all broker connections for a user
 */
export async function listBrokerConnections(userId: string) {
  return prisma.brokerConnection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get broker connection by ID
 */
export async function getBrokerConnection(connectionId: string, userId: string) {
  return prisma.brokerConnection.findFirst({
    where: { 
      id: connectionId,
      userId 
    },
  });
}

/**
 * Delete a broker connection
 */
export async function deleteBrokerConnection(connectionId: string, userId: string) {
  try {
    // Get connection to get SnapTrade user details
    const connection = await getBrokerConnection(connectionId, userId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();
    const decryptedSecret = getDecryptedSecret(connection.snapTradeUserSecret);

    // Try to delete from SnapTrade (don't fail if this errors)
    try {
      await client.authentication.deleteSnapTradeUser({
        userId: connection.snapTradeUserId,
      });
      console.log('Successfully deleted SnapTrade user:', connection.snapTradeUserId);
    } catch (error) {
      console.warn('Failed to delete SnapTrade user, continuing with local deletion:', error);
    }

    // Delete from our database
    await prisma.brokerConnection.delete({
      where: { 
        id: connectionId,
        userId 
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting broker connection:', error);
    throw new Error(handleSnapTradeError(error));
  }
}