/**
 * Browser-safe token utilities for client components
 * This file contains NO server-side dependencies
 */

export interface FeedbackTokenPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Decode JWT token payload in browser-safe way (no libraries needed)
 * This is safe to use in client components
 * Note: This does NOT verify the token - verification happens server-side
 */
export function decodeTokenBrowser(token: string): FeedbackTokenPayload | null {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    // Decode the payload (middle part)
    const payload = parts[1];

    // Base64 decode (handle URL-safe base64)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token in browser:', error);
    return null;
  }
}