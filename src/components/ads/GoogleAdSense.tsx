'use client';

import React, { useEffect, useRef } from 'react';

interface GoogleAdSenseProps {
  adClient: string;
  adSlot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle' | 'fluid';
  layout?: 'in-article' | 'in-feed' | 'fixed';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const GoogleAdSense: React.FC<GoogleAdSenseProps> = ({
  adClient,
  adSlot,
  format = 'auto',
  layout,
  responsive = true,
  className = '',
  style,
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!adClient || !adSlot) return;
    if (pushed.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      // AdSense not loaded yet or ad block active
    }
  }, [adClient, adSlot]);

  if (!adClient || !adSlot) return null;

  return (
    <div className={`google-ad-container ${className}`} style={style}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          textAlign: 'center',
          ...style,
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        {...(layout ? { 'data-ad-layout': layout } : {})}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

/**
 * AdSense Script Loader — mount once in layout
 */
export const AdSenseScript: React.FC<{ client: string }> = ({ client }) => {
  useEffect(() => {
    if (!client) return;
    if (document.querySelector(`script[data-adsense-client="${client}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.setAttribute('data-adsense-client', client);
    document.head.appendChild(script);
  }, [client]);

  return null;
};
