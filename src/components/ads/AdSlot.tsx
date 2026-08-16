'use client';

import React, { useEffect, useState } from 'react';
import { AdPlacement, AdConfiguration } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { Megaphone, ExternalLink, Sparkles } from 'lucide-react';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adConfig, setAdConfig] = useState<AdConfiguration | null>(null);
  const [adsAllowed, setAdsAllowed] = useState(true);
  const [mounted, setMounted] = useState(false);

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

      // Plan-driven gating: join subscriptions → plans to check adsEnabled
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

      // Fetch ad config for this placement
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
      }
    }

    loadAd();
  }, [placement]);

  if (!mounted) return null;
  if (!adsAllowed) return null;
  if (!adConfig || !adConfig.enabled) return null;

  return (
    <div
      className={`relative group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md transition-all duration-300 hover:border-slate-700/80 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Megaphone className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
            Sponsored Partner
          </span>
        </div>

        {/* Upgrade Incentive Badge */}
        <a
          href="/#pricing"
          className="text-[11px] font-medium text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
          title="Upgrade to Pro for an ad-free experience"
        >
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Remove Ads</span>
        </a>
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
          {adConfig.bannerTitle}
          <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-blue-400" />
        </h4>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          {adConfig.bannerText}
        </p>
      </div>
    </div>
  );
};
