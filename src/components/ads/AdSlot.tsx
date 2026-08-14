'use client';

import React, { useEffect, useState } from 'react';
import { AdPlacement, AdConfiguration, PlanTier } from '@/types';
import { isAdFreeUser } from '@/lib/services/entitlementEngine';
import { mockStorage } from '@/lib/services/mockStorage';
import { Megaphone, ExternalLink, Sparkles } from 'lucide-react';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adConfig, setAdConfig] = useState<AdConfiguration | null>(null);
  const [userTier, setUserTier] = useState<PlanTier>('FREE');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = mockStorage.getState();
    setUserTier(state.currentTier);

    const config = state.adConfigurations.find(
      (a) => a.placement === placement && a.enabled
    );
    if (config) {
      setAdConfig(config);
    }
  }, [placement]);

  if (!mounted) return null;

  // Centralized Entitlement Check — Pro & Business Users are Ad-Free!
  if (isAdFreeUser(userTier)) {
    return null;
  }

  // If placement disabled or not configured, return null
  if (!adConfig || !adConfig.enabled) {
    return null;
  }

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
