'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';

// Generate a session ID for the browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('page-tracking-session-id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('page-tracking-session-id', sessionId);
  }
  return sessionId;
}

// Check if analytics cookies are enabled
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

// Send tracking data to the API
async function trackPageView(
  path: string,
  sessionId: string,
  duration?: number,
  exitedAt?: Date
) {
  try {
    const body = JSON.stringify({
      path,
      sessionId,
      duration,
      exitedAt: exitedAt?.toISOString(),
    });

    // Use sendBeacon for reliable tracking on page unload
    if (duration && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/tracking/page-view', blob);
    } else {
      // Use fetch for initial page entry
      await fetch('/api/tracking/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.debug('Page tracking error:', error);
  }
}

export function usePageTracking() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  const entryTimeRef = useRef<number>(0);
  const hasTrackedEntry = useRef<boolean>(false);

  useEffect(() => {
    // Don't track if:
    // - User is not authenticated
    // - Still loading user data
    // - Analytics consent not given
    // - On a public page
    if (!user || isLoading || !hasAnalyticsConsent()) {
      return;
    }

    // Skip tracking for public pages and API routes
    if (
      pathname === '/' ||
      pathname === '/pricing' ||
      pathname === '/privacy' ||
      pathname === '/cookies' ||
      pathname === '/terms' ||
      pathname === '/contact' ||
      pathname.startsWith('/api/')
    ) {
      return;
    }

    const sessionId = getSessionId();
    entryTimeRef.current = Date.now();
    hasTrackedEntry.current = false;

    // Track page entry
    trackPageView(pathname, sessionId);
    hasTrackedEntry.current = true;

    // Function to track page exit
    const trackExit = () => {
      if (!hasTrackedEntry.current) return;

      const duration = Date.now() - entryTimeRef.current;
      const exitedAt = new Date();

      // Only track if user spent at least 1 second on the page
      if (duration >= 1000) {
        trackPageView(pathname, sessionId, duration, exitedAt);
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
        trackPageView(pathname, sessionId);
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
    };
  }, [pathname, user, isLoading]);
}