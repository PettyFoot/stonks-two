import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

/**
 * CSRF Protection Utility
 * Provides token generation and validation for preventing CSRF attacks
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'fallback-secret-for-development';
const TOKEN_LENGTH = 32;
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

export interface CSRFTokenData {
  token: string;
  timestamp: number;
  userId?: string;
}

/**
 * Generate a CSRF token for a user session
 */
export function generateCSRFToken(userId?: string): string {
  const timestamp = Date.now();
  const randomData = randomBytes(TOKEN_LENGTH);
  
  // Create payload
  const payload = JSON.stringify({
    userId: userId || 'anonymous',
    timestamp,
    random: randomData.toString('hex'),
  });
  
  // Sign the payload
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  
  // Combine payload and signature
  const token = Buffer.from(payload).toString('base64') + '.' + signature;
  
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(
  token: string, 
  expectedUserId?: string
): { valid: boolean; expired: boolean; reason?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, expired: false, reason: 'Missing or invalid token' };
    }
    
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, expired: false, reason: 'Invalid token format' };
    }
    
    const [payloadBase64, providedSignature] = parts;
    
    // Decode payload
    const payload = Buffer.from(payloadBase64, 'base64').toString();
    let tokenData: Record<string, unknown>;
    
    try {
      tokenData = JSON.parse(payload);
    } catch {
      return { valid: false, expired: false, reason: 'Invalid token payload' };
    }
    
    // Verify signature
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');
    
    if (!timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      return { valid: false, expired: false, reason: 'Invalid signature' };
    }
    
    // Check expiration
    const now = Date.now();
    const tokenAge = now - (tokenData.timestamp as number);
    
    if (tokenAge > TOKEN_LIFETIME_MS) {
      return { valid: false, expired: true, reason: 'Token expired' };
    }
    
    // Check user ID if provided
    if (expectedUserId && tokenData.userId !== expectedUserId) {
      return { valid: false, expired: false, reason: 'User ID mismatch' };
    }
    
    return { valid: true, expired: false };
    
  } catch (error) {
    console.error('CSRF token validation error:', error);
    return { valid: false, expired: false, reason: 'Validation error' };
  }
}

/**
 * Middleware helper for CSRF protection
 */
export function createCSRFMiddleware() {
  return function validateCSRF(
    token: string | null,
    userId?: string
  ): { isValid: boolean; shouldRegenerate: boolean; error?: string } {
    if (!token) {
      return {
        isValid: false,
        shouldRegenerate: true,
        error: 'CSRF token required'
      };
    }
    
    const validation = validateCSRFToken(token, userId);
    
    if (!validation.valid) {
      return {
        isValid: false,
        shouldRegenerate: validation.expired,
        error: validation.reason || 'Invalid CSRF token'
      };
    }
    
    return { isValid: true, shouldRegenerate: false };
  };
}

/**
 * Extract CSRF token from request headers
 */
export function extractCSRFToken(headers: Headers): string | null {
  // Try different header names
  return (
    headers.get('x-csrf-token') ||
    headers.get('csrf-token') ||
    headers.get('x-xsrf-token') ||
    null
  );
}

/**
 * Generate response headers with CSRF token
 */
export function getCSRFResponseHeaders(token: string): Record<string, string> {
  return {
    'X-CSRF-Token': token,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  };
}