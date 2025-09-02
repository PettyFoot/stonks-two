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
    // Initialize ad when component mounts (script is loaded globally)
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