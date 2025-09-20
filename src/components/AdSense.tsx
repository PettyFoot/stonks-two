'use client';

import { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  className?: string;
  slot?: string;
  format?: string;
  responsive?: boolean;
}

export default function AdSense({
  className = '',
  slot = '1234567890',
  format = 'auto',
  responsive = true
}: AdSenseProps) {
  const { hasPremiumAccess, isLoading: subscriptionLoading } = useSubscription();
  const adRef = useRef<HTMLModElement>(null);
  const initializedRef = useRef(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) {
      return;
    }

    // Skip in development if needed to prevent errors
    if (process.env.NODE_ENV === 'development') {
      // Check if already has adsbygoogle data attribute indicating it's already processed
      if (adRef.current?.getAttribute('data-adsbygoogle-status')) {
        return;
      }
    }

    const initializeAd = async () => {
      try {
        // Ensure adsbygoogle script is loaded
        if (!window.adsbygoogle) {
          throw new Error('AdSense script not loaded');
        }

        // Check if the container has a valid width
        if (adRef.current) {
          const rect = adRef.current.getBoundingClientRect();
          if (rect.width === 0) {
            // Container has no width yet, retry later
            console.warn('AdSense: Container has no width, delaying initialization');
            initializedRef.current = false;
            return;
          }
        }

        // Mark as initialized to prevent duplicate calls
        initializedRef.current = true;

        // Initialize the ad
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        
        setAdLoaded(true);
        setAdError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'AdSense initialization failed';
        
        // Don't log errors for "no slot size" as we handle this with width check
        if (!errorMessage.includes('availableWidth=0')) {
          console.error('AdSense error:', errorMessage);
        }
        
        setAdError(errorMessage);
        setAdLoaded(false);
        
        // Reset initialization flag on error to allow retry
        initializedRef.current = false;
      }
    };

    // Use IntersectionObserver to wait for element to be visible
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio > 0) {
          // Element is visible, initialize ad
          initializeAd();
          observer.disconnect();
        }
      },
      { threshold: 0.01 }
    );

    // Wait for DOM to be ready and observe the element
    const timeoutId = setTimeout(() => {
      if (adRef.current) {
        observer.observe(adRef.current);
      } else {
        // Fallback if ref is not ready
        initializeAd();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [slot]); // Re-run if slot changes

  // Don't show ads for premium users
  if (hasPremiumAccess) {
    return null;
  }

  // Don't show ads while checking subscription status
  if (subscriptionLoading) {
    return null;
  }

  // Show error state in development
  if (adError && process.env.NODE_ENV === 'development') {
    return (
      <div className={`adsense-container ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">AdSense Error: {adError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`adsense-container ${className}`} style={{ minWidth: '250px', minHeight: '50px' }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '250px', minHeight: '50px' }}
        data-ad-client="ca-pub-7836991491773203"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
      {!adLoaded && !adError && process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-gray-100 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-500">Loading ad...</p>
        </div>
      )}
    </div>
  );
}