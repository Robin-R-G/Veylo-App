import { PlanEntitlements, PlanTier } from '@/types';

export const PLAN_LIMITS: Record<PlanTier, PlanEntitlements> = {
  FREE: {
    maxVehicles: 1,
    allowPdfDownload: false,
    allowStaffAccounts: false,
    allowCustomBranding: false,
    isAdFree: false,
    allowAdvancedAnalytics: false,
    allowTripEstimator: true,
  },
  STARTER: {
    maxVehicles: 3,
    allowPdfDownload: false,
    allowStaffAccounts: false,
    allowCustomBranding: false,
    isAdFree: false,
    allowAdvancedAnalytics: false,
    allowTripEstimator: true,
  },
  PRO: {
    maxVehicles: 10,
    allowPdfDownload: true,
    allowStaffAccounts: false,
    allowCustomBranding: true,
    isAdFree: true,
    allowAdvancedAnalytics: true,
    allowTripEstimator: true,
  },
  BUSINESS: {
    maxVehicles: 999, // Unlimited for business
    allowPdfDownload: true,
    allowStaffAccounts: true,
    allowCustomBranding: true,
    isAdFree: true,
    allowAdvancedAnalytics: true,
    allowTripEstimator: true,
  },
};

export function getEntitlementsForTier(tier: PlanTier): PlanEntitlements {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.FREE;
}

export function canAddVehicle(currentCount: number, tier: PlanTier): { allowed: boolean; limit: number } {
  const entitlements = getEntitlementsForTier(tier);
  return {
    allowed: currentCount < entitlements.maxVehicles,
    limit: entitlements.maxVehicles,
  };
}

export function isAdFreeUser(tier: PlanTier): boolean {
  return getEntitlementsForTier(tier).isAdFree;
}
