'use client';

import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';

/**
 * Provider component that enables analytics tracking across the entire app.
 * Tracks ALL visitors (authenticated + non-authenticated) across ALL pages.
 *
 * Features:
 * - Captures UTM parameters from landing page (utm_source, utm_medium, etc.)
 * - Tracks page views with duration
 * - Records navigation flow (previous page)
 * - Respects cookie consent (only tracks if analytics cookies are enabled)
 * - Works for both authenticated and anonymous users
 *
 * Should be placed in the root layout to track all page navigations.
 */
export function AnalyticsTrackingProvider() {
  useAnalyticsTracking();
  return null;
}
