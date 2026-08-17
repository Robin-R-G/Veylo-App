'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/services/financialEngine';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminSkeleton } from '@/components/ui/Skeleton';
import { PlatformRevenueLog, PlatformRevenueType, Subscription, SaaSPlan, Invoice } from '@/types';
import {
  RevenueRange,
  RevenueLogLike,
  aggregateRevenue,
  revenueSeries,
  summarizeOwnerRevenue,
  computeSaaSMetrics,
} from '@/lib/services/platformEconomics';

const RANGES: { value: RevenueRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12mo', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

const TYPE_LABELS: Record<PlatformRevenueType, string> = {
  SUBSCRIPTION: 'Subscriptions',
  PLATFORM_FEE: 'Platform Fees',
  PREMIUM_FEATURE: 'Premium Features',
  ADVERTISING: 'Advertising',
  OTHER: 'Other',
};

export default function AdminRevenuePage() {
  const [range, setRange] = useState<RevenueRange>('30d');
  const [logs, setLogs] = useState<RevenueLogLike[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    async function load() {
      const [revRes, invRes, subRes, planRes] = await Promise.all([
        supabase.from('platform_revenue').select('*').order('created_at', { ascending: false }),
        supabase.from('invoices').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('plans').select('*').order('price_paise'),
      ]);

      if (revRes.data) setLogs(revRes.data as RevenueLogLike[]);
      if (invRes.data) setInvoices(invRes.data as Invoice[]);
      if (subRes.data) setSubscriptions(subRes.data as Subscription[]);
      if (planRes.data) setPlans(planRes.data as SaaSPlan[]);
    }

    load();
  }, []);

  if (!mounted) return <AdminSkeleton />;

  const breakdown = aggregateRevenue(logs, range);
  const series = revenueSeries(logs, range);
  const maxSeries = Math.max(1, ...series.map(s => s.value));
  const owner = summarizeOwnerRevenue(invoices);
  const metrics = computeSaaSMetrics({ subscriptions, plans, revenueLogs: logs });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue & SaaS Analytics"
        subtitle="Platform earnings, owner settlements, subscriptions & growth metrics"
        icon="monitoring"
      />

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === r.value
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface border border-outline-variant'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Platform revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Platform Revenue</span>
            <span className="material-symbols-outlined text-primary text-sm">payments</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{formatCurrency(breakdown.total)}</p>
          <span className="text-[10px] text-on-surface-variant">{RANGES.find(r => r.value === range)?.label}</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Subscription MRR</span>
            <span className="material-symbols-outlined text-primary text-sm">subscriptions</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{formatCurrency(metrics.mrr)}</p>
          <span className="text-[10px] text-on-surface-variant">ARR {formatCurrency(metrics.arr)}</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Active Organizations</span>
            <span className="material-symbols-outlined text-primary text-sm">domain</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{metrics.activeOrganizations}</p>
          <span className="text-[10px] text-on-surface-variant">
            {metrics.paidOrganizations} paid · {metrics.trialOrganizations} trial · {metrics.freeOrganizations} free
          </span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Conversion · Churn</span>
            <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {Math.round(metrics.conversionRate * 100)}% · {Math.round(metrics.churnRate * 100)}%
          </p>
          <span className="text-[10px] text-on-surface-variant">ARPU {formatCurrency(metrics.arpu)}/org</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by type */}
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-base font-bold text-on-surface">Revenue by Source</h2>
          <div className="space-y-3">
            {(Object.keys(TYPE_LABELS) as PlatformRevenueType[]).map(type => {
              const amount = breakdown.byType[type];
              const pct = breakdown.total > 0 ? (amount / breakdown.total) * 100 : 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-on-surface">{TYPE_LABELS[type]}</span>
                    <span className="text-on-surface-variant">
                      {formatCurrency(amount)} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-base font-bold text-on-surface">Revenue Trend</h2>
          <div className="flex items-end gap-1.5 h-40">
            {series.map(point => (
              <div key={point.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-primary/70 hover:bg-primary rounded-t transition-all"
                  style={{ height: `${(point.value / maxSeries) * 100}%` }}
                  title={`${point.label}: ${formatCurrency(point.value)}`}
                />
                <span className="text-[9px] text-on-surface-variant truncate w-full text-center">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Owner settlement summary */}
      <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <h2 className="text-base font-bold text-on-surface">Owner Settlement Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-on-surface">{formatCurrency(owner.paidRupees)}</p>
            <span className="text-[10px] text-on-surface-variant">Settled to Owner</span>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(owner.pendingRupees)}</p>
            <span className="text-[10px] text-on-surface-variant">Pending Settlement</span>
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface">{formatCurrency(owner.todayRupees)}</p>
            <span className="text-[10px] text-on-surface-variant">Today's Earnings</span>
          </div>
          <div>
            <p className="text-lg font-bold text-on-surface">{formatCurrency(owner.totalRupees)}</p>
            <span className="text-[10px] text-on-surface-variant">Lifetime Gross</span>
          </div>
        </div>
      </div>
    </div>
  );
}
