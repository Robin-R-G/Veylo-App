'use client';

import React from 'react';
import Link from 'next/link';
import { PlanTier } from '@/types';

interface UpgradePromptProps {
  feature: string;
  currentTier: PlanTier;
  requiredTier: PlanTier;
  className?: string;
}

const TIER_LABELS: Record<PlanTier, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  BUSINESS: 'Business',
};

const TIER_ORDER: PlanTier[] = ['FREE', 'PRO', 'BUSINESS'];

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  currentTier,
  requiredTier,
  className = '',
}) => {
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const requiredIdx = TIER_ORDER.indexOf(requiredTier);

  if (currentIdx >= requiredIdx) return null;

  return (
    <div className={`bg-primary-container/30 rounded-2xl border border-primary/20 p-5 text-center space-y-3 ${className}`}>
      <span className="material-symbols-outlined text-3xl text-primary">lock</span>
      <h3 className="font-bold text-sm text-on-surface">{feature}</h3>
      <p className="text-xs text-on-surface-variant">
        Upgrade to <span className="font-bold text-primary">{TIER_LABELS[requiredTier]}</span> to unlock this feature.
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
      >
        <span className="material-symbols-outlined text-sm">upgrade</span>
        Upgrade to {TIER_LABELS[requiredTier]}
      </Link>
    </div>
  );
};

/**
 * Inline badge for feature gating
 */
export const FeatureBadge: React.FC<{
  label: string;
  requiredTier: PlanTier;
  currentTier: PlanTier;
}> = ({ label, requiredTier, currentTier }) => {
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const requiredIdx = TIER_ORDER.indexOf(requiredTier);
  const unlocked = currentIdx >= requiredIdx;

  if (unlocked) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[10px] font-bold uppercase">
      <span className="material-symbols-outlined text-[10px]">lock</span>
      {TIER_LABELS[requiredTier]} Only
    </span>
  );
};
