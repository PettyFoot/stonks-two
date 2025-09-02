'use client';

import { useEffect } from 'react';

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
  useEffect(() => {
    // Load AdSense script if not already loaded
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7836991491773203';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Initialize ad when script is loaded
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7836991491773203"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}