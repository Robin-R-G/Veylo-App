'use client';

import { useState, useEffect } from 'react';
import { PlanTier, PlanEntitlements } from '@/types';
import { authService } from '@/lib/services/authService';
import { getEntitlementsForTier } from '@/lib/services/entitlementEngine';
import { mockStorage } from '@/lib/services/mockStorage';

interface UsePlanTierResult {
  tier: PlanTier;
  entitlements: PlanEntitlements;
  loading: boolean;
}

export function usePlanTier(): UsePlanTierResult {
  const [tier, setTier] = useState<PlanTier>('FREE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = authService.getSession();
    if (!session) {
      setTier('FREE');
      setLoading(false);
      return;
    }

    // Read from mockStorage (demo) — in production, fetch from Supabase subscriptions table
    const state = mockStorage.getState();
    const orgTier = state.organization?.planTier || state.currentTier || 'FREE';
    setTier(orgTier);
    setLoading(false);
  }, []);

  return {
    tier,
    entitlements: getEntitlementsForTier(tier),
    loading,
  };
}
