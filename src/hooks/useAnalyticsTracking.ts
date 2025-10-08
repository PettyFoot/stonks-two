'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';

// UTM parameters interface
interface UtmParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

// Session data stored in sessionStorage
interface SessionData extends UtmParams {
  sessionId: string;
  landingPage: string;
  referrer: string;
  firstSeen: string;
}

/**
 * Generate or retrieve analytics session ID
 * Session ID persists for the browser session (tab lifetime)
 */
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  const SESSION_KEY = 'analytics-session-id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Extract UTM parameters from URL search params
 */
function extractUtmParams(searchParams: URLSearchParams | null): UtmParams {
  if (!searchParams) return {};

  return {
    utmSource: searchParams.get('utm_source') || undefined,
    utmMedium: searchParams.get('utm_medium') || undefined,
    utmCampaign: searchParams.get('utm_campaign') || undefined,
    utmTerm: searchParams.get('utm_term') || undefined,
    utmContent: searchParams.get('utm_content') || undefined,
  };
}

/**
 * Store session data (including UTM params) in sessionStorage
 */
function storeSessionData(sessionId: string, utmParams: UtmParams, pathname: string): SessionData {
  if (typeof window === 'undefined') {
    return {
      sessionId,
      landingPage: pathname,
      referrer: '',
      firstSeen: new Date().toISOString(),
    };
  }

  const SESSION_DATA_KEY = 'analytics-session-data';

  // Check if session data already exists
  const existingData = sessionStorage.getItem(SESSION_DATA_KEY);
  if (existingData) {
    try {
      return JSON.parse(existingData) as SessionData;
    } catch (error) {
      console.error('Failed to parse session data:', error);
    }
  }

  // Create new session data
  const sessionData: SessionData = {
    sessionId,
    ...utmParams,
    landingPage: pathname,
    referrer: document.referrer,
    firstSeen: new Date().toISOString(),
  };

  sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
  return sessionData;
}

/**
 * Get stored session data
 */
function getSessionData(): SessionData | null {
  if (typeof window === 'undefined') return null;

  const SESSION_DATA_KEY = 'analytics-session-data';
  const data = sessionStorage.getItem(SESSION_DATA_KEY);

  if (!data) return null;

  try {
    return JSON.parse(data) as SessionData;
  } catch (error) {
    console.error('Failed to parse session data:', error);
    return null;
  }
}

/**
 * Check if analytics cookies are enabled
 */
function hasAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const consentCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('cookie-consent='));

    if (!consentCookie) return false;

    const consentData = JSON.parse(decodeURIComponent(consentCookie.split('=')[1]));
    return consentData.hasConsented && consentData.preferences.analytics;
  } catch (error) {
    console.error('Error checking analytics consent:', error);
    return false;
  }
}

/**
 * Send analytics tracking data to the API
 */
async function trackAnalytics(
  action: 'session_start' | 'page_view',
  sessionId: string,
  options: {
    path?: string;
    previousPath?: string;
    duration?: number;
    exitedAt?: Date;
    utmParams?: UtmParams;
    landingPage?: string;
    referrer?: string;
    userAgent?: string;
  } = {}
) {
  try {
    const body = JSON.stringify({
      sessionId,
      action,
      ...options,
    });

    // Use sendBeacon for reliable tracking on page unload
    if (options.duration && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      // Use fetch for initial page entry
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.debug('Analytics tracking error:', error);
  }
}

/**
 * Hook to track analytics across all pages (authenticated + non-authenticated users)
 */
export function useAnalyticsTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser(); // Optional - we track both authenticated and non-authenticated

  const entryTimeRef = useRef<number>(0);
  const hasTrackedEntry = useRef<boolean>(false);
  const previousPathRef = useRef<string>('');
  const sessionInitialized = useRef<boolean>(false);

  useEffect(() => {
    // Don't track if analytics consent not given
    if (!hasAnalyticsConsent()) {
      return;
    }

    // Skip tracking for API routes
    if (pathname.startsWith('/api/')) {
      return;
    }

    // Get or create session ID
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    // Initialize session on first page load (only once per session)
    if (!sessionInitialized.current) {
      const utmParams = extractUtmParams(searchParams);
      const sessionData = storeSessionData(sessionId, utmParams, pathname);

      // Send session start event
      trackAnalytics('session_start', sessionId, {
        utmParams,
        landingPage: sessionData.landingPage,
        referrer: sessionData.referrer,
        userAgent: navigator.userAgent,
      });

      sessionInitialized.current = true;
    }

    // Track page entry
    entryTimeRef.current = Date.now();
    hasTrackedEntry.current = false;

    trackAnalytics('page_view', sessionId, {
      path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
      previousPath: previousPathRef.current || undefined,
    });
    hasTrackedEntry.current = true;

    // Function to track page exit
    const trackExit = () => {
      if (!hasTrackedEntry.current) return;

      const duration = Date.now() - entryTimeRef.current;
      const exitedAt = new Date();

      // Only track if user spent at least 1 second on the page
      if (duration >= 1000) {
        trackAnalytics('page_view', sessionId, {
          path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
          duration,
          exitedAt,
        });
      }
    };

    // Track on visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackExit();
      } else if (document.visibilityState === 'visible') {
        // Reset entry time when returning to page
        entryTimeRef.current = Date.now();
        hasTrackedEntry.current = false;
        trackAnalytics('page_view', sessionId, {
          path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
          previousPath: previousPathRef.current || undefined,
        });
        hasTrackedEntry.current = true;
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', trackExit);

    // Cleanup function - track exit when component unmounts (navigation)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', trackExit);
      trackExit();

      // Update previous path for next page
      previousPathRef.current = pathname;
    };
  }, [pathname, searchParams, user]);
}
