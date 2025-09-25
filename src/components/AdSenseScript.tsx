'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { useEffect } from 'react';

/**
 * Component that conditionally loads Google AdSense script only for non-premium users
 */
export default function AdSenseScript() {
  const { hasPremiumAccess, isLoading } = useSubscription();

  useEffect(() => {
    // Don't load script if user has premium access
    if (hasPremiumAccess) {
      if (process.env.NODE_ENV === 'development') {
        console.log('AdSenseScript: Skipping script load for premium user');
      }
      return;
    }

    // Don't load script while subscription is still loading to prevent flashing
    if (isLoading) {
      return;
    }

    // Check if script is already loaded
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      return;
    }

    // Load AdSense script only for non-premium users
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7836991491773203';
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('AdSenseScript: Script loaded successfully');
      }
    };

    script.onerror = () => {
      if (process.env.NODE_ENV === 'development') {
        console.error('AdSenseScript: Failed to load script');
      }
    };

    document.head.appendChild(script);

    return () => {
      // Clean up script if component unmounts
      const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [hasPremiumAccess, isLoading]);

  // This component doesn't render anything visible
  return null;
}