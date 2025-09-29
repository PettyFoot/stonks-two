'use client';

import { usePageTracking } from '@/hooks/usePageTracking';

/**
 * Provider component that enables page tracking across the app.
 * Should be placed in the root layout to track all page navigations.
 */
export function PageTrackingProvider() {
  usePageTracking();
  return null;
}