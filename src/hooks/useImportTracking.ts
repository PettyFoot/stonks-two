'use client';

import { useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

// Generate a session ID for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('import-tracking-session-id');
  if (!sessionId) {
    sessionId = `import_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('import-tracking-session-id', sessionId);
  }
  return sessionId;
}

export interface ImportTrackingData {
  action: string;
  component: string;
  outcome?: 'success' | 'failure' | 'cancelled';
  errorMessage?: string;
  metadata?: Record<string, any>;
  importBatchId?: string;
}

/**
 * Non-blocking tracking for import page interactions
 * Follows the same fire-and-forget pattern as usePageTracking.ts
 *
 * SAFETY: This hook will NEVER block user actions or throw errors.
 * All tracking failures are silent and logged to console only.
 */
export function useImportTracking() {
  const { user } = useUser();

  const track = useCallback((data: ImportTrackingData) => {
    // Don't track if no user (same as usePageTracking)
    if (!user) return;

    const sessionId = getSessionId();

    // Fire and forget - never block user actions
    trackImportInteraction({
      ...data,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }, [user]);

  return { track };
}

/**
 * Fire-and-forget tracking function
 * NEVER awaited to prevent blocking user actions
 *
 * @param data Tracking data to send
 */
async function trackImportInteraction(data: any) {
  try {
    // Use fetch with keepalive flag (same as usePageTracking)
    // keepalive ensures request completes even if page navigates
    fetch('/api/tracking/import-interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch((error) => {
      // Silent fail - don't disrupt user experience
      console.debug('Import tracking failed:', error);
    });
  } catch (error) {
    // Double protection: outer try-catch
    console.debug('Import tracking error:', error);
  }
}
