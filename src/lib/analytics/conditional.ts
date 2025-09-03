'use client';

import { cookieManager } from '@/lib/cookies/manager';

/**
 * Conditionally send analytics data only if user has consented
 */
export function sendConditionalAnalytics(metric: any) {
  // Only send if user has consented to analytics cookies
  if (!cookieManager.hasConsent() || !cookieManager.isCategoryEnabled('analytics')) {
    return;
  }

  try {
    const body = JSON.stringify(metric);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body);
    } else {
      fetch('/api/vitals', { body, method: 'POST', keepalive: true });
    }
  } catch (error) {
    console.error('Failed to send analytics:', error);
  }
}

/**
 * Initialize web vitals reporting with consent check
 */
export function initConditionalWebVitals() {
  // Only initialize if analytics are enabled
  if (!cookieManager.hasConsent() || !cookieManager.isCategoryEnabled('analytics')) {
    return;
  }

  if (typeof window !== 'undefined') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(sendConditionalAnalytics);
      getFID(sendConditionalAnalytics);
      getFCP(sendConditionalAnalytics);
      getLCP(sendConditionalAnalytics);
      getTTFB(sendConditionalAnalytics);
    }).catch(error => {
      console.error('Failed to load web-vitals:', error);
    });
  }
}