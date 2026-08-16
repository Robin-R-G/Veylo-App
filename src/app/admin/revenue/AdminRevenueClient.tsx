'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { platformRevenueService } from '@/lib/services/platformRevenueService';
import { formatCurrency } from '@/lib/services/financialEngine';
import { PageHeader } from '@/components/ui/PageHeader';
import { RevenueRange } from '@/lib/services/platformEconomics';
import { AppSession } from '@/types';

const RANGES: { key: RevenueRange; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12mo', label: '12 months' },
];

async function fetchData(range: RevenueRange) {
  const [breakdown, series, metrics, ownerSummary, ledger] = await Promise.all([
    platformRevenueService.getPlatformRevenueBreakdown(range),
    platformRevenueService.getRevenueSeries(range),
    platformRevenueService.getSaaSMetrics(),
    platformRevenueService.getOwnerRevenueSummary(),
    platformRevenueService.getSubscriptionLedger(),
  ]);
  return { breakdown, series, metrics, ownerSummary, ledger };
}

export default function AdminRevenueClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const [range, setRange] = useState<RevenueRange>('30d');
  const [tick, setTick] = useState(0);

  const reload = () => setTick(t => t + 1);

  useEffect(() => {
    setMounted(true);
    const s = authService.getSession();
    setSession(s);
    if (!s || s.role !== 'ADMIN') {
      router.replace('/login');
    }
  }, [router]);

  const [data, setData] = useState<Awaited<ReturnType<typeof fetchData>> | null>(null);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    fetchData(range).then(d => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [mounted, range, tick]);

  if (!mounted || !session) return null;
  if (session.role !== 'ADMIN') return null;
  if (!data) return null;

  const { breakdown, series, metrics, ownerSummary, ledger } = data;
  const maxSeries = Math.max(...series.map(s => s.value), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Revenue"
        subtitle="Admin revenue analytics — SaaS earnings are tracked separately from owner rental money"
        icon="monitoring"
        backHref="/admin"
        action={
          <Link
            href="/admin/settings/monetization"
            className="px-4 py-2.5 rounded-xl border border-primary text-primary font-bold text-xs flex items-center gap-1.5 hover:bg-primary hover:text-on-primary transition-all"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            Monetization Settings
          </Link>
        }
      />

      {/* Revenue split banner */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-base">call_split</span>
        <p className="text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface">Platform Revenue</strong> = subscriptions + platform fees + premium features +
          advertising (money earned by the SaaS). <strong className="text-on-surface">Owner Rental Revenue</strong> is money
          riders pay to vehicle owners and is shown separately below — it is never counted as platform income.
        </p>
      </div>

      {/* Platform revenue summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Total Platform Revenue</span>
          <span className="font-extrabold text-2xl text-primary mt-1 block">{formatCurrency(breakdown.total)}</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5 block">Selected period</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Subscriptions</span>
          <span className="font-extrabold text-2xl text-on-surface mt-1 block">{formatCurrency(breakdown.byType.SUBSCRIPTION)}</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Platform Fees</span>
          <span className="font-extrabold text-2xl text-on-surface mt-1 block">{formatCurrency(breakdown.byType.PLATFORM_FEE)}</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Premium Features</span>
          <span className="font-extrabold text-2xl text-on-surface mt-1 block">{formatCurrency(breakdown.byType.PREMIUM_FEATURE)}</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Advertising</span>
          <span className="font-extrabold text-2xl text-on-surface mt-1 block">{formatCurrency(breakdown.byType.ADVERTISING)}</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Other</span>
          <span className="font-extrabold text-2xl text-on-surface mt-1 block">{formatCurrency(breakdown.byType.OTHER)}</span>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            Daily Platform Revenue
          </h2>
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant">
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  range === r.key ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
          {series.map((s, i) => (
            <div key={i} className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full group" title={`${s.label}: ${formatCurrency(s.value)}`}>
              <span className="text-[9px] font-bold text-primary mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {s.value > 0 ? `₹${s.value}` : ''}
              </span>
              <div
                className={`w-full rounded-t ${s.value > 0 ? 'bg-primary/80 group-hover:bg-primary' : 'bg-surface-container-high'}`}
                style={{ height: `${Math.max((s.value / maxSeries) * 100, s.value > 0 ? 4 : 2)}%` }}
              />
              {series.length <= 31 && <span className="text-[8px] text-on-surface-variant mt-1">{s.label}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* SaaS metrics */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">query_stats</span>
          SaaS Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">MRR</span>
            <span className="font-extrabold text-lg text-primary mt-1 block">{formatCurrency(metrics.mrr)}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">ARR</span>
            <span className="font-extrabold text-lg text-primary mt-1 block">{formatCurrency(metrics.arr)}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Active Orgs</span>
            <span className="font-extrabold text-lg text-on-surface mt-1 block">{metrics.activeOrganizations}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Paid / Free / Trial</span>
            <span className="font-extrabold text-lg text-on-surface mt-1 block">{metrics.paidOrganizations} / {metrics.freeOrganizations} / {metrics.trialOrganizations}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Conversion</span>
            <span className="font-extrabold text-lg text-on-surface mt-1 block">{metrics.conversionRate}%</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Churn (30d)</span>
            <span className="font-extrabold text-lg text-on-surface mt-1 block">{metrics.churnRate}%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">ARPU (MRR/active)</span>
            <span className="font-extrabold text-base text-primary mt-1 block">{formatCurrency(metrics.arpu)}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Past Due</span>
            <span className="font-extrabold text-base text-amber-800 mt-1 block">{metrics.pastDueOrganizations}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Cancelled / Expired</span>
            <span className="font-extrabold text-base text-red-800 mt-1 block">{metrics.cancelledOrganizations}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Total Orgs</span>
            <span className="font-extrabold text-base text-on-surface mt-1 block">{metrics.totalOrganizations}</span>
          </div>
        </div>
      </div>

      {/* Owner rental revenue (shown separately — NOT platform revenue) */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-700">account_balance</span>
          Owner Rental Revenue (Separate Ledger)
        </h2>
        <p className="text-xs text-on-surface-variant">
          Money riders pay to vehicle owners. Displayed for admin oversight only — it is never included in platform revenue.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Today</span>
            <span className="font-extrabold text-lg text-emerald-800 mt-1 block">{formatCurrency(ownerSummary.todayRupees)}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">This Month</span>
            <span className="font-extrabold text-lg text-emerald-800 mt-1 block">{formatCurrency(ownerSummary.thisMonthRupees)}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Pending</span>
            <span className="font-extrabold text-lg text-amber-800 mt-1 block">{formatCurrency(ownerSummary.pendingRupees)}</span>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Paid (All Time)</span>
            <span className="font-extrabold text-lg text-emerald-800 mt-1 block">{formatCurrency(ownerSummary.paidRupees)}</span>
          </div>
        </div>
      </div>

      {/* Subscription ledger */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">groups</span>
          Organization Subscriptions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                <th className="py-3 px-3">Organization</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Period End</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(sub => (
                <tr key={sub.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                  <td className="py-3 px-3 font-bold text-on-surface">{sub.organizationName}</td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-primary">{sub.planId}</span>
                    <span className="text-[10px] text-on-surface-variant ml-1">({sub.plan?.name})</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
