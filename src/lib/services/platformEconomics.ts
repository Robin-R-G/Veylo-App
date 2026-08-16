import type {
  PlatformMonetizationSettings,
  PlatformRevenueType,
  Subscription,
  SaaSPlan,
  Invoice,
} from '@/types';

// =============================================================================
// Pure money/accounting logic. No storage, no window, no side effects.
// All functions are deterministic so they can be unit-tested in plain Node.
// =============================================================================

export type RevenueRange = '7d' | '30d' | '90d' | '12mo' | 'all';

export const REVENUE_TYPES: PlatformRevenueType[] = [
  'SUBSCRIPTION',
  'PLATFORM_FEE',
  'PREMIUM_FEATURE',
  'ADVERTISING',
  'OTHER',
];

export interface RevenueLogLike {
  amountRupees: number;
  revenueType: PlatformRevenueType;
  createdAt: string;
}

export interface OwnerRevenueSummary {
  todayRupees: number;
  thisMonthRupees: number;
  pendingRupees: number;
  paidRupees: number;
  totalRupees: number;
}

export interface RevenueBreakdown {
  byType: Record<PlatformRevenueType, number>;
  total: number;
}

export interface SaaSMetrics {
  mrr: number;
  arr: number;
  totalOrganizations: number;
  activeOrganizations: number;
  freeOrganizations: number;
  paidOrganizations: number;
  trialOrganizations: number;
  pastDueOrganizations: number;
  cancelledOrganizations: number;
  conversionRate: number; // paid / total
  churnRate: number; // cancelled+expired in last 30 days / active at start
  arpu: number; // average revenue per organization (MRR / active orgs)
}

// -----------------------------------------------------------------------------
// Platform fee — config-driven, rounded to paise.
// -----------------------------------------------------------------------------
export function computePlatformFee(
  rentalAmountRupees: number,
  settings: Pick<PlatformMonetizationSettings, 'platformFeeEnabled' | 'platformFeeType' | 'platformFeeValue'>
): number {
  if (!settings.platformFeeEnabled || settings.platformFeeType === 'NONE') return 0;
  if (settings.platformFeeType === 'FIXED') return Math.round(settings.platformFeeValue * 100) / 100;
  if (settings.platformFeeType === 'PERCENTAGE') {
    return Math.round(rentalAmountRupees * settings.platformFeeValue) / 100;
  }
  return 0;
}

export interface MoneySplit {
  ownerRupees: number;
  platformRupees: number;
  totalRupees: number;
}

/** Split a rental amount between owner and platform. Owner money is never touched by the fee. */
export function splitRentalMoney(
  rentalAmountRupees: number,
  settings: Pick<PlatformMonetizationSettings, 'platformFeeEnabled' | 'platformFeeType' | 'platformFeeValue'>
): MoneySplit {
  const platformRupees = computePlatformFee(rentalAmountRupees, settings);
  return { ownerRupees: rentalAmountRupees, platformRupees, totalRupees: rentalAmountRupees + platformRupees };
}

// -----------------------------------------------------------------------------
// Date window helpers — periods are calendar-based and measured, not guessed.
// -----------------------------------------------------------------------------
export function daysForRange(range: RevenueRange, now = new Date()): number | null {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '12mo': return 365;
    case 'all': return null;
  }
}

export function isInRange(createdAt: string, range: RevenueRange, now = new Date()): boolean {
  const days = daysForRange(range, now);
  if (days === null) return true;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(createdAt).getTime() >= cutoff;
}

// -----------------------------------------------------------------------------
// Revenue aggregation — PLATFORM money only. Owner rental money never enters here.
// -----------------------------------------------------------------------------
export function aggregateRevenue(logs: RevenueLogLike[], range: RevenueRange, now = new Date()): RevenueBreakdown {
  const byType: Record<PlatformRevenueType, number> = {
    SUBSCRIPTION: 0,
    PLATFORM_FEE: 0,
    PREMIUM_FEATURE: 0,
    ADVERTISING: 0,
    OTHER: 0,
  };
  let total = 0;

  for (const log of logs) {
    if (!isInRange(log.createdAt, range, now)) continue;
    const type = REVENUE_TYPES.includes(log.revenueType) ? log.revenueType : 'OTHER';
    byType[type] = Math.round((byType[type] + log.amountRupees) * 100) / 100;
    total = Math.round((total + log.amountRupees) * 100) / 100;
  }
  return { byType, total };
}

// Build a daily-series (for charts) from platform revenue logs.
export function revenueSeries(logs: RevenueLogLike[], range: RevenueRange, now = new Date()): { label: string; value: number }[] {
  const days = daysForRange(range, now);
  if (days === null || days <= 0) return [];
  const series: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    series.push({ label, value: 0 });
  }
  for (const log of logs) {
    if (!isInRange(log.createdAt, range, now)) continue;
    const t = new Date(log.createdAt);
    const idx = days - 1 - Math.floor((now.getTime() - t.getTime()) / 86400000);
    if (idx >= 0 && idx < series.length) {
      series[idx].value = Math.round((series[idx].value + log.amountRupees) * 100) / 100;
    }
  }
  return series;
}

// -----------------------------------------------------------------------------
// Owner rental money — completely separate from platform revenue.
// -----------------------------------------------------------------------------
export function summarizeOwnerRevenue(invoices: Pick<Invoice, 'paymentStatus' | 'totalRupees' | 'issuedAt'>[]): OwnerRevenueSummary {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthStr = now.toISOString().slice(0, 7);
  const pendingStatuses = ['PENDING', 'PAYMENT_INITIATED', 'PAYMENT_SUBMITTED', 'PAYMENT_PROCESSING', 'UNDER_REVIEW'];

  let todayRupees = 0;
  let thisMonthRupees = 0;
  let pendingRupees = 0;
  let paidRupees = 0;
  let totalRupees = 0;

  for (const inv of invoices) {
    const amt = Number(inv.totalRupees) || 0;
    totalRupees = Math.round((totalRupees + amt) * 100) / 100;
    const issued = inv.issuedAt || '';
    if (issued.startsWith(todayStr) && inv.paymentStatus === 'PAID') {
      todayRupees = Math.round((todayRupees + amt) * 100) / 100;
    }
    if (issued.startsWith(monthStr) && inv.paymentStatus === 'PAID') {
      thisMonthRupees = Math.round((thisMonthRupees + amt) * 100) / 100;
    }
    if (inv.paymentStatus === 'PAID') {
      paidRupees = Math.round((paidRupees + amt) * 100) / 100;
    } else if (pendingStatuses.includes(inv.paymentStatus)) {
      pendingRupees = Math.round((pendingRupees + amt) * 100) / 100;
    }
  }
  return { todayRupees, thisMonthRupees, pendingRupees, paidRupees, totalRupees };
}

// -----------------------------------------------------------------------------
// SaaS metrics — MRR/ARR only count paid (non-free) ACTIVE/TRIAL subscriptions.
// Period for churn is explicitly the last 30 days.
// -----------------------------------------------------------------------------
export function computeSaaSMetrics(params: {
  subscriptions: Pick<Subscription, 'planId' | 'status' | 'cancelledAt' | 'createdAt' | 'currentPeriodEnd'>[];
  plans: Pick<SaaSPlan, 'id' | 'priceRupees'>[];
  revenueLogs: RevenueLogLike[];
  now?: Date;
}): SaaSMetrics {
  const now = params.now || new Date();
  const priceFor = (planId: string) => params.plans.find(p => p.id === planId)?.priceRupees || 0;

  const totalOrganizations = params.subscriptions.length;
  const active = params.subscriptions.filter(s => s.status === 'ACTIVE');
  const trial = params.subscriptions.filter(s => s.status === 'TRIAL');
  const pastDue = params.subscriptions.filter(s => s.status === 'PAST_DUE');
  const cancelled = params.subscriptions.filter(s => s.status === 'CANCELLED' || s.status === 'EXPIRED');
  const activeOrTrial = params.subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL');

  const freeCount = activeOrTrial.filter(s => priceFor(s.planId) === 0).length;
  const paidOrganizations = activeOrTrial.filter(s => priceFor(s.planId) > 0).length;
  const activeOrganizations = activeOrTrial.length;

  const mrr = Math.round(activeOrTrial.reduce((sum, s) => sum + priceFor(s.planId), 0) * 100) / 100;
  const arr = Math.round(mrr * 12 * 100) / 100;

  // Churn: subscriptions that left (cancelled/expired) in the last 30 days,
  // measured against subscriptions that existed at the start of the window.
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const churned = cancelled.filter(s => {
    const at = s.cancelledAt || s.createdAt;
    return new Date(at).getTime() >= cutoff;
  }).length;
  const existedAtStart = params.subscriptions.filter(s => new Date(s.createdAt).getTime() <= cutoff).length;
  const churnRate = existedAtStart > 0 ? Math.round((churned / existedAtStart) * 10000) / 100 : 0;

  const conversionRate = totalOrganizations > 0 ? Math.round((paidOrganizations / totalOrganizations) * 10000) / 100 : 0;
  const arpu = activeOrganizations > 0 ? Math.round((mrr / activeOrganizations) * 100) / 100 : 0;

  return {
    mrr,
    arr,
    totalOrganizations,
    activeOrganizations,
    freeOrganizations: freeCount,
    paidOrganizations,
    trialOrganizations: trial.length,
    pastDueOrganizations: pastDue.length,
    cancelledOrganizations: cancelled.length,
    conversionRate,
    churnRate,
    arpu,
  };
}

// -----------------------------------------------------------------------------
// Payment state validation for webhook-style transitions.
// The ONLY callers that may transition to a terminal state are the provider
// webhook (server) or an explicit owner confirmation. Browser "returned from
// UPI app" never marks a payment PAID.
// -----------------------------------------------------------------------------
export const PAYMENT_STATE_ORDER = [
  'PENDING',
  'PAYMENT_INITIATED',
  'PAYMENT_PROCESSING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'UNDER_REVIEW',
] as const;

export function isLegalPaymentTransition(from: string, to: string): boolean {
  // Terminal states are never re-applied: a PAID payment cannot be marked PAID
  // again, a REFUNDED payment cannot be refunded again.
  if (from === to) return !['PAID', 'REFUNDED'].includes(from);
  if (to === 'PAID') return ['PENDING', 'PAYMENT_INITIATED', 'PAYMENT_PROCESSING', 'UNDER_REVIEW'].includes(from);
  if (to === 'REFUNDED') return from === 'PAID';
  if (to === 'FAILED') return ['PENDING', 'PAYMENT_INITIATED', 'PAYMENT_PROCESSING'].includes(from);
  if (to === 'UNDER_REVIEW') return true;
  if (to === 'PAYMENT_INITIATED') return from === 'PENDING';
  if (to === 'PAYMENT_PROCESSING') return ['PENDING', 'PAYMENT_INITIATED'].includes(from);
  return true;
}
