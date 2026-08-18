'use client';

import React, { useEffect, useState } from 'react';
import { AdPlacement, AdConfiguration, PlanTier } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { GoogleAdSense } from './GoogleAdSense';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

const ADSENSE_PLACEMENT_MAP: Record<string, { slot: string; format: string }> = {
  'dashboard-bottom': { slot: '1234567890', format: 'auto' },
  'vehicle-bottom': { slot: '1234567891', format: 'auto' },
  'invoice-bottom': { slot: '1234567892', format: 'auto' },
  'public-page-bottom': { slot: '1234567893', format: 'auto' },
  'reports-bottom': { slot: '1234567894', format: 'auto' },
};

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adConfig, setAdConfig] = useState<AdConfiguration | null>(null);
  const [adsAllowed, setAdsAllowed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [adProvider, setAdProvider] = useState<'custom' | 'adsense' | null>(null);

  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    async function loadAd() {
      // Admin global switch
      const { data: mono } = await supabase
        .from('platform_monetization_settings')
        .select('advertising_enabled')
        .eq('id', 1)
        .single();

      if (mono && !mono.advertising_enabled) {
        setAdsAllowed(false);
        return;
      }

      // Plan-driven gating: check if user's plan allows ads
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plans!inner(ads_enabled)')
        .eq('status', 'ACTIVE')
        .limit(1)
        .single();

      if (sub && !(sub.plans as any).ads_enabled) {
        setAdsAllowed(false);
        return;
      }

      // Try custom ad config first
      const { data: ad } = await supabase
        .from('ad_configurations')
        .select('*')
        .eq('placement', placement)
        .eq('enabled', true)
        .single();

      if (ad) {
        setAdConfig({
          id: ad.id,
          placement: ad.placement,
          enabled: ad.enabled,
          provider: ad.provider,
          premiumExcluded: ad.premium_excluded,
          bannerTitle: ad.banner_title,
          bannerText: ad.banner_text,
          bannerUrl: ad.banner_url,
        });
        setAdProvider('custom');
      } else if (adClient) {
        // Fall back to Google AdSense
        setAdProvider('adsense');
      }
    }

    loadAd();
  }, [placement, adClient]);

  if (!mounted) return null;
  if (!adsAllowed) return null;

  // Custom ad
  if (adProvider === 'custom' && adConfig && adConfig.enabled) {
    return (
      <div
        className={`relative group overflow-hidden rounded-xl border border-outline-variant bg-surface p-4 backdrop-blur-md transition-all duration-300 hover:border-outline ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">campaign</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant">
              Sponsored Partner
            </span>
          </div>
          <a
            href="/#pricing"
            className="text-[11px] font-medium text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors"
            title="Upgrade to Pro for an ad-free experience"
          >
            <span className="material-symbols-outlined text-xs text-tertiary">auto_awesome</span>
            <span>Remove Ads</span>
          </a>
        </div>
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
            {adConfig.bannerTitle}
            <span className="material-symbols-outlined text-xs text-on-surface-variant group-hover:text-primary">open_in_new</span>
          </h4>
          <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
            {adConfig.bannerText}
          </p>
        </div>
      </div>
    );
  }

  // Google AdSense
  if (adProvider === 'adsense' && adClient) {
    const adsenseConfig = ADSENSE_PLACEMENT_MAP[placement];
    if (adsenseConfig) {
      return (
        <div className={`my-4 ${className}`}>
          <GoogleAdSense
            adClient={adClient}
            adSlot={adsenseConfig.slot}
            format={adsenseConfig.format as any}
            responsive
          />
        </div>
      );
    }
  }

  return null;
};
