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
const ENCRYPTION_KEY = process.env.SNAPTRADE_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text: string): string {
  // Create a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create a key from the provided key (ensure it's 32 bytes for AES-256)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to the encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  try {
    // Split IV and encrypted data
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    // Create a key from the provided key
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Fallback to old decryption method for backwards compatibility
    console.warn('Falling back to legacy decryption method');
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
      let decrypted = decipher.update(text, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (legacyError) {
      throw new Error('Failed to decrypt data with both new and legacy methods');
    }
  }
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

    // Check if user already has SnapTrade credentials
    const existingUser = await prisma.user.findFirst({
      where: { 
        auth0Id: request.userId,
        snapTradeUserId: { not: null }
      }
    });

    let snapTradeUserId: string;
    let snapTradeUserSecret: string;

    if (existingUser?.snapTradeUserId && existingUser?.snapTradeUserSecret) {
      // Use existing credentials
      snapTradeUserId = existingUser.snapTradeUserId;
      snapTradeUserSecret = decrypt(existingUser.snapTradeUserSecret);
      console.log('Using existing SnapTrade credentials for user:', request.userId);
    } else {
      // Generate unique SnapTrade user ID
      snapTradeUserId = uuidv4();

      // Register user with SnapTrade
      const registerResponse = await client.authentication.registerSnapTradeUser({
        userId: snapTradeUserId,
      });

      // Get the userSecret from the registration response
      const userSecretFromResponse = registerResponse.data.userSecret;

      if (!userSecretFromResponse) {
        throw new Error('Failed to get user secret from SnapTrade registration');
      }

      snapTradeUserSecret = userSecretFromResponse;

      // IMMEDIATELY store credentials in Users table
      await prisma.user.update({
        where: { auth0Id: request.userId },
        data: {
          snapTradeUserId,
          snapTradeUserSecret: encrypt(snapTradeUserSecret),
          snapTradeRegisteredAt: new Date(),
        },
      });

      console.log('Stored new SnapTrade credentials for user:', request.userId);
    }

    // Get authorization URL from SnapTrade for the connection portal
    console.log('Calling SnapTrade loginSnapTradeUser with:', {
      userId: snapTradeUserId,
      userSecret: snapTradeUserSecret ? '[REDACTED]' : 'undefined',
      redirectUri: request.redirectUri
    });

    const authResponse = await client.authentication.loginSnapTradeUser({
      userId: snapTradeUserId,
      userSecret: snapTradeUserSecret,
    });

    // Extract redirect URI from response
    const loginResponse = authResponse.data as any;
    const redirectUri = loginResponse.redirectURI || loginResponse.redirectUri || loginResponse.redirectURL || loginResponse.authenticationLoginURL;
    
    console.log('SnapTrade login response:', loginResponse);
    console.log('Available response keys:', Object.keys(loginResponse));

    if (!redirectUri) {
      console.error('No redirect URI found in response. Full response:', JSON.stringify(loginResponse, null, 2));
      throw new Error('Failed to get redirect URI from SnapTrade. Check API credentials and configuration.');
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

    // Get user's SnapTrade credentials from Users table
    const user = await prisma.user.findFirst({
      where: { 
        auth0Id: request.userId,
        snapTradeUserId: request.snapTradeUserId 
      }
    });

    if (!user?.snapTradeUserSecret) {
      throw new Error('SnapTrade credentials not found for user');
    }

    const snapTradeUserSecret = decrypt(user.snapTradeUserSecret);

    // Get all brokerage authorizations for this user
    const authorizationsResponse = await client.connections.listBrokerageAuthorizations({
      userId: request.snapTradeUserId,
      userSecret: snapTradeUserSecret,
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
      userSecret: snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];
    const primaryAccount = accounts[0]; // Use first account as primary

    const brokerAuth = {
      name: latestAuth.name || 'Connected Broker',
      id: latestAuth.id,
    };

    // Check if connection already exists
    const existingConnection = await prisma.brokerConnection.findFirst({
      where: { 
        userId: request.userId,
        snapTradeUserId: request.snapTradeUserId 
      }
    });

    let brokerConnection;
    if (existingConnection) {
      // Update existing connection
      brokerConnection = await prisma.brokerConnection.update({
        where: { id: existingConnection.id },
        data: {
          brokerName: brokerAuth.name || 'Unknown Broker',
          accountId: primaryAccount?.id || null,
          accountName: primaryAccount?.name || primaryAccount?.number || null,
          status: 'ACTIVE',
          lastSyncError: null,
        },
      });
    } else {
      // Create new connection (fallback)
      const encryptedSecret = encrypt(snapTradeUserSecret);
      
      brokerConnection = await prisma.brokerConnection.create({
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
    }

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
 * Get SnapTrade credentials for a user from the Users table
 */
export async function getSnapTradeCredentials(userId: string): Promise<{
  snapTradeUserId: string;
  snapTradeUserSecret: string;
} | null> {
  const user = await prisma.user.findFirst({
    where: { 
      auth0Id: userId,
      snapTradeUserId: { not: null },
      snapTradeUserSecret: { not: null }
    }
  });

  if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) {
    return null;
  }

  return {
    snapTradeUserId: user.snapTradeUserId,
    snapTradeUserSecret: decrypt(user.snapTradeUserSecret),
  };
}

/**
 * Validate SnapTrade webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // SnapTrade typically sends signatures with a prefix (e.g., "sha256=")
    let cleanSignature = signature;
    if (signature.startsWith('sha256=')) {
      cleanSignature = signature.substring(7);
    }

    // Create HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    console.log('Webhook signature validation:', {
      receivedSignature: cleanSignature,
      expectedSignature: expectedSignature,
      payloadLength: payload.length
    });

    // Use timing-safe comparison
    if (cleanSignature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
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