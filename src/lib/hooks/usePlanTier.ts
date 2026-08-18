'use client';

import { useState, useEffect } from 'react';
import { PlanTier, PlanEntitlements } from '@/types';
import { authService } from '@/lib/services/authService';
import { getEntitlementsForTier } from '@/lib/services/entitlementEngine';

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

    // In production, fetch from org/subscription
    // For now, default to FREE
    setTier('FREE');
    setLoading(false);
  }, []);

  return {
    tier,
    entitlements: getEntitlementsForTier(tier),
    loading,
  };
}
