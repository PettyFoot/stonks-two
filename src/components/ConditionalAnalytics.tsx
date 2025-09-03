'use client';

import { useEffect, useState } from 'react';
import { Analytics } from "@vercel/analytics/next";
import { cookieManager } from '@/lib/cookies/manager';

export function ConditionalAnalytics() {
  const [shouldLoadAnalytics, setShouldLoadAnalytics] = useState(false);

  useEffect(() => {
    // Check if user has consented to analytics cookies
    const hasConsent = cookieManager.hasConsent();
    const analyticsEnabled = cookieManager.isCategoryEnabled('analytics');
    
    setShouldLoadAnalytics(hasConsent && analyticsEnabled);
  }, []);

  // Only render Analytics component if consent is given
  if (!shouldLoadAnalytics) {
    return null;
  }

  return <Analytics />;
}