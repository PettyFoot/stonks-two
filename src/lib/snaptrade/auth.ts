import { getSnapTradeClient, handleSnapTradeError, RateLimitHelper } from './client';
import { prisma } from '@/lib/prisma';
import {
  CreateConnectionRequest,
  CreateConnectionResponse,
  AuthCompleteRequest,
  AuthCompleteResponse,
} from './types';
import { syncTradesForConnection } from './sync';
import { SyncType } from './types';
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
      // Use existing credentials (decrypt the stored secret)
      snapTradeUserId = existingUser.snapTradeUserId;
      snapTradeUserSecret = decrypt(existingUser.snapTradeUserSecret);

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

      // IMMEDIATELY store credentials in Users table (encrypt the secret)
      await prisma.user.update({
        where: { auth0Id: request.userId },
        data: {
          snapTradeUserId,
          snapTradeUserSecret: encrypt(snapTradeUserSecret),
          snapTradeRegisteredAt: new Date(),
        },
      });


    }

    // Get authorization URL from SnapTrade for the connection portal
    console.log('[SNAPTRADE_AUTH] Generating auth URL:', {
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
    


    // Get accounts for this authorization
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: request.snapTradeUserId,
      userSecret: snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];
    const primaryAccount = accounts[0]; // Use first account as primary

    // Connection successful - trigger initial sync in background
    const connectionResult = {
      success: true,
      connection: {
        id: latestAuth.id || '',
        snapTradeUserId: request.snapTradeUserId,
        brokerName: latestAuth.name || 'Connected Broker',
        accountId: primaryAccount?.id || null,
        accountName: primaryAccount?.name || primaryAccount?.number || null,
        status: 'ACTIVE',
        accounts: accounts.map((account: any) => ({
          id: account.id,
          number: account.number,
          name: account.name,
          type: account.meta?.type || null,
          balance: account.balance,
          currency: account.balance?.currency || null,
        })),
      },
    };

    // Trigger initial sync in background (don't await to avoid blocking the response)
    setImmediate(async () => {
      try {
        console.log(`[SNAPTRADE_AUTH] Triggering initial sync for user ${request.userId} after successful connection`);
        await syncTradesForConnection({
          userId: request.userId,
          connectionId: latestAuth.id || request.userId,
          syncType: SyncType.AUTOMATIC,
        });
        console.log(`[SNAPTRADE_AUTH] Initial sync completed for user ${request.userId}`);
      } catch (syncError) {
        console.error(`[SNAPTRADE_AUTH] Initial sync failed for user ${request.userId}:`, syncError);
        // Don't throw error since connection was successful
      }
    });

    return connectionResult;
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
export function getDecryptedSecret(secret: string): string {
  return decrypt(secret);
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
    
    console.log('[SNAPTRADE_AUTH] Signature verification:', {
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
 * Get all broker connections for a user from SnapTrade API
 */
export async function getSnapTradeBrokerConnections(userId: string) {
  const credentials = await getSnapTradeCredentials(userId);
  if (!credentials) {
    return [];
  }

  try {
    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Get all brokerage authorizations from SnapTrade
    const authorizationsResponse = await client.connections.listBrokerageAuthorizations({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    const authorizations = authorizationsResponse.data || [];

    // Get accounts for this user
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId: credentials.snapTradeUserId,
      userSecret: credentials.snapTradeUserSecret,
    });

    const accounts = accountsResponse.data || [];

    // Map authorizations to a consistent format
    return authorizations.map((auth: any) => {
      const associatedAccounts = accounts.filter((account: any) => 
        account.brokerage_authorization?.id === auth.id
      );

      return {
        id: auth.id,
        snapTradeUserId: credentials.snapTradeUserId,
        brokerName: auth.name || 'Unknown Broker',
        status: auth.disabled ? 'INACTIVE' : 'ACTIVE',
        accounts: associatedAccounts.map((account: any) => ({
          id: account.id,
          number: account.number,
          name: account.name,
          type: account.meta?.type || null,
          balance: account.balance,
          currency: account.balance?.currency || null,
        })),
        createdAt: auth.created_date,
        updatedAt: auth.updated_date,
      };
    });
  } catch (error) {
    console.error('Error fetching SnapTrade connections:', error);
    return [];
  }
}


/**
 * Delete all broker connections for a user (delete SnapTrade user)
 */
export async function deleteSnapTradeUser(userId: string) {
  try {
    const credentials = await getSnapTradeCredentials(userId);
    if (!credentials) {
      throw new Error('SnapTrade credentials not found');
    }

    await RateLimitHelper.checkRateLimit();
    const client = getSnapTradeClient();

    // Delete the SnapTrade user (this removes all their connections)
    try {
      await client.authentication.deleteSnapTradeUser({
        userId: credentials.snapTradeUserId,
      });

    } catch (error) {
      console.warn('Failed to delete SnapTrade user:', error);
      throw error;
    }

    // Clear SnapTrade credentials from our database
    await prisma.user.update({
      where: { auth0Id: userId },
      data: {
        snapTradeUserId: null,
        snapTradeUserSecret: null,
        snapTradeRegisteredAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting SnapTrade user:', error);
    throw new Error(handleSnapTradeError(error));
  }
}