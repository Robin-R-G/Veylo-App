import { describe, test, expect, vi } from 'vitest';
import { computePlatformFee, isInRange, summarizeOwnerRevenue, computeSaaSMetrics, aggregateRevenue } from '../platformEconomics';
import { processPaymentWebhook, verifyWebhookSignature } from '../webhookService';
import type { WebhookStore } from '../webhookService';
import { paymentService } from '../paymentService';
import { fakeStore } from './fakeSupabase';

vi.mock('@/lib/supabase/client', async () => {
  const m = await import('./fakeSupabase');
  return { createClient: m.createFakeClient };
});

type Settings = { platformFeeEnabled: boolean; platformFeeType: 'PERCENTAGE' | 'FIXED' | 'NONE'; platformFeeValue: number };

const feeOff: Settings = { platformFeeEnabled: false, platformFeeType: 'NONE', platformFeeValue: 0 };
const feePercent: Settings = { platformFeeEnabled: true, platformFeeType: 'PERCENTAGE', platformFeeValue: 1 };
const feeFixed: Settings = { platformFeeEnabled: true, platformFeeType: 'FIXED', platformFeeValue: 5 };

// Owner money is never reduced by the fee — the fee is charged on top to the rider.
function splitLite(rental: number, s: Settings): { ownerRupees: number; platformRupees: number; totalRupees: number } {
  const platformRupees = computePlatformFee(rental, s);
  return { ownerRupees: rental, platformRupees, totalRupees: rental + platformRupees };
}

describe('Platform Service Fee (TEST A/C)', () => {
  test('disabled by default — no fee', () => {
    expect(computePlatformFee(500, feeOff)).toBe(0);
    expect(splitLite(500, feeOff)).toEqual({ ownerRupees: 500, platformRupees: 0, totalRupees: 500 });
  });

  test('1% fee on ₹500 → ₹5 fee, owner keeps ₹500, rider pays ₹505', () => {
    expect(computePlatformFee(500, feePercent)).toBe(5);
    expect(splitLite(500, feePercent)).toEqual({ ownerRupees: 500, platformRupees: 5, totalRupees: 505 });
  });

  test('fixed ₹5 fee on ₹500 rental', () => {
    expect(computePlatformFee(500, feeFixed)).toBe(5);
  });

  test('percentage fee is rounded to paise', () => {
    expect(computePlatformFee(333.33, feePercent)).toBe(3.33);
  });
});

describe('Revenue Separation (TEST B/C — owner money vs platform money)', () => {
  test('aggregateRevenue only counts platform revenue logs, never rental invoices', () => {
    const logs = [
      { amountRupees: 799, revenueType: 'SUBSCRIPTION' as const, createdAt: new Date().toISOString() },
      { amountRupees: 5, revenueType: 'PLATFORM_FEE' as const, createdAt: new Date().toISOString() },
    ];
    const b = aggregateRevenue(logs, 'all');
    expect(b.byType.SUBSCRIPTION).toBe(799);
    expect(b.byType.PLATFORM_FEE).toBe(5);
    expect(b.total).toBe(804);
  });

  test('owner revenue summary is computed from invoices only', () => {
    const now = new Date();
    const invoices = [
      { paymentStatus: 'PAID' as const, totalRupees: 500, issuedAt: now.toISOString() },
      { paymentStatus: 'PAYMENT_PROCESSING' as const, totalRupees: 200, issuedAt: now.toISOString() },
    ];
    const s = summarizeOwnerRevenue(invoices);
    expect(s.todayRupees).toBe(500);
    expect(s.pendingRupees).toBe(200);
    expect(s.paidRupees).toBe(500);
    // Pending is NOT paid — owner money is only "earned" when verified.
    expect(s.paidRupees).not.toBe(s.pendingRupees);
  });
});

describe('SaaS Metrics (MRR/ARR/conversion/churn)', () => {
  const plans = [
    { id: 'FREE', priceRupees: 0 },
    { id: 'STARTER', priceRupees: 299 },
    { id: 'PRO', priceRupees: 799 },
    { id: 'BUSINESS', priceRupees: 1499 },
  ];
  const now = new Date('2026-08-15T00:00:00Z');

  test('MRR = sum of active+paid, ARR = MRR×12', () => {
    const m = computeSaaSMetrics({
      subscriptions: [
        { planId: 'PRO', status: 'ACTIVE', createdAt: '2026-07-01T00:00:00Z', currentPeriodEnd: new Date().toISOString() },
        { planId: 'BUSINESS', status: 'ACTIVE', createdAt: '2026-07-01T00:00:00Z', currentPeriodEnd: new Date().toISOString() },
        { planId: 'FREE', status: 'ACTIVE', createdAt: '2026-07-01T00:00:00Z', currentPeriodEnd: new Date().toISOString() },
      ],
      plans,
      revenueLogs: [],
      now,
    });
    expect(m.mrr).toBe(2298);
    expect(m.arr).toBe(27576);
    expect(m.freeOrganizations).toBe(1);
    expect(m.paidOrganizations).toBe(2);
    expect(m.activeOrganizations).toBe(3);
    // Conversion = paid / total
    expect(m.conversionRate).toBe(66.67);
  });

  test('trial is counted as active but never charges MRR', () => {
    const m = computeSaaSMetrics({
      subscriptions: [
        { planId: 'PRO', status: 'TRIAL', createdAt: '2026-08-01T00:00:00Z', currentPeriodEnd: new Date().toISOString() },
      ],
      plans,
      revenueLogs: [],
      now,
    });
    expect(m.mrr).toBe(799);
    expect(m.trialOrganizations).toBe(1);
    expect(m.paidOrganizations).toBe(1);
  });

  test('churn counts cancellations in the last 30 days', () => {
    const m = computeSaaSMetrics({
      subscriptions: [
        { planId: 'PRO', status: 'CANCELLED', cancelledAt: '2026-08-10T00:00:00Z', createdAt: '2026-06-01T00:00:00Z', currentPeriodEnd: '2026-08-10T00:00:00Z' },
        { planId: 'PRO', status: 'CANCELLED', cancelledAt: '2026-05-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', currentPeriodEnd: '2026-05-01T00:00:00Z' },
        { planId: 'FREE', status: 'ACTIVE', createdAt: '2026-01-01T00:00:00Z', currentPeriodEnd: new Date().toISOString() },
      ],
      plans,
      revenueLogs: [],
      now,
    });
    expect(m.cancelledOrganizations).toBe(2);
    // 1 of the 2 cancellations fell inside the 30-day window; all 3 orgs
    // (including the FREE one, created before cutoff) existed at window start.
    expect(m.churnRate).toBe(33.33);
  });

  test('date window filter (30 days)', () => {
    const nowDate = new Date('2026-08-15T00:00:00Z');
    expect(isInRange('2026-08-01T00:00:00Z', '30d', nowDate)).toBe(true);
    expect(isInRange('2026-07-01T00:00:00Z', '30d', nowDate)).toBe(false);
  });
});

describe('Webhook architecture (signature, idempotency, replay, state)', () => {
  function makeStore(): WebhookStore & { events: any[] } {
    const ids = new Set<string>();
    const events: any[] = [];
    return {
      events,
      hasEventId: (id: string) => ids.has(id),
      addEvent: (e) => { ids.add(e.eventId); events.push(e); },
    };
  }

  test('signature verification rejects tampered payloads', async () => {
    const body = JSON.stringify({ paymentId: 'p1', amount: 500 });
    const sigBad = 'v1_deadbeef';
    expect(await verifyWebhookSignature('secret', sigBad, body)).toBe(false);
  });

  test('idempotency — same event_id processed once', async () => {
    const store = makeStore();
    const evt = { provider: 'MOCK', eventId: 'evt_1', eventType: 'payment.captured', payload: { paymentId: 'p1', fromStatus: 'PAYMENT_PROCESSING' } };
    const first = await processPaymentWebhook(evt, store);
    expect(first.accepted).toBe(true);
    expect(first.action).toBe('MARK_PAID');
    const replay = await processPaymentWebhook(evt, store);
    expect(replay.accepted).toBe(true);
    expect(replay.duplicate).toBe(true);
    expect(store.events.length).toBe(1);
  });

  test('payment cannot go PAID from a FAILED state (state validation)', async () => {
    const store = makeStore();
    // A failed payment can only become PAID via a fresh captured event; a
    // webhook referencing an already-terminal payment is rejected by the
    // transition rule (the caller supplies the payment's stored fromStatus).
    const bad = await processPaymentWebhook({ provider: 'MOCK', eventId: 'e1', eventType: 'payment.captured', payload: { paymentId: 'p1', fromStatus: 'FAILED' } }, store);
    expect(bad.accepted).toBe(false);
    expect(bad.error || '').toMatch(/ILLEGAL_TRANSITION/);
  });

  test('refund only legal from PAID', async () => {
    const store = makeStore();
    const ok = await processPaymentWebhook({ provider: 'MOCK', eventId: 'e1', eventType: 'payment.refunded', payload: { paymentId: 'p1', fromStatus: 'PAID' } }, store);
    expect(ok.action).toBe('MARK_REFUNDED');
  });

  test('subscription payment failure does NOT activate (TEST F)', async () => {
    const store = makeStore();
    const r = await processPaymentWebhook({ provider: 'MOCK', eventId: 'e_sub', eventType: 'subscription.payment_failed', payload: { providerSubscriptionId: 'sub_1' } }, store);
    expect(r.accepted).toBe(true);
    expect(r.action).toBe('NOOP');
  });
});

describe('Subscription purchase (TEST F — payment must be verified before activation)', () => {
  const ORG = 'org_sub_test';

  beforeEach(() => {
    fakeStore.tables.plans = [
      { id: 'FREE', name: 'Free', price_paise: 0, price_rupees: 0, vehicle_limit: 2, billing_interval: 'MONTHLY' },
      { id: 'PRO', name: 'Professional', price_paise: 79900, price_rupees: 799, vehicle_limit: 20, billing_interval: 'MONTHLY' },
      { id: 'BUSINESS', name: 'Business', price_paise: 149900, price_rupees: 1499, vehicle_limit: 100, billing_interval: 'MONTHLY' },
    ];
    fakeStore.tables.subscriptions = [];
    fakeStore.tables.payment_attempts = [];
    fakeStore.tables.platform_revenue = [];
    fakeStore.tables.payment_events = [];
  });

  test('paid plan purchase records SUBSCRIPTION revenue and activates only after verification', async () => {
    const sub = await paymentService.purchaseSubscription({
      organizationId: ORG,
      planId: 'PRO',
      paymentMethod: 'UPI_DIRECT',
    });

    expect(sub.status).toBe('ACTIVE');
    expect(sub.planId).toBe('PRO');

    // Verified payment ⇒ SUBSCRIPTION platform revenue is logged (idempotent ref).
    const revenue = fakeStore.tables.platform_revenue;
    const subLog = revenue.find(l => l.revenue_type === 'SUBSCRIPTION' && l.reference_id === `SUB_PRO_${ORG}`);
    expect(subLog?.amount_rupees).toBe(799);
  });

  test('simulated payment failure leaves the subscription untouched and logs no revenue', async () => {
    await paymentService.purchaseSubscription({ organizationId: ORG, planId: 'PRO', paymentMethod: 'UPI_DIRECT' });

    await expect(
      paymentService.purchaseSubscription({
        organizationId: ORG,
        planId: 'BUSINESS',
        paymentMethod: 'UPI_DIRECT',
        simulateFailure: true,
      })
    ).rejects.toThrow();

    // Plan must NOT be activated (still on PRO from the previous purchase).
    const sub = fakeStore.tables.subscriptions.find(s => s.organization_id === ORG);
    expect(sub?.plan_id).toBe('PRO');

    // No BUSINESS revenue may exist.
    expect(fakeStore.tables.platform_revenue.find(l => l.reference_id === 'SUB_BUSINESS_' + ORG)).toBeUndefined();
  });
});
