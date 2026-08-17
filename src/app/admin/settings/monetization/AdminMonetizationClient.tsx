'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import { createClient } from '@/lib/supabase/client';
import { SaaSPlan, PlatformMonetizationSettings } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminSkeleton } from '@/components/ui/Skeleton';
import { mockStorage } from '@/lib/services/mockStorage';
import { AppSession } from '@/types';

export default function AdminMonetizationClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);

  const [settings, setSettings] = useState<PlatformMonetizationSettings>({
    platformFeeEnabled: false,
    platformFeeType: 'NONE',
    platformFeeValue: 0,
    advertisingEnabled: true,
    trialDays: 7,
  });
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    const s = authService.getSession();
    setSession(s);
    if (!s || s.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    async function load() {
      const supabase = createClient();
      const [settingsRes, plansRes] = await Promise.all([
        supabase.from('platform_settings').select('value').eq('key', 'monetization').single(),
        supabase.from('plans').select('*').order('price_paise'),
      ]);

      if (settingsRes.data?.value) setSettings(settingsRes.data.value as PlatformMonetizationSettings);
      if (plansRes.data) setPlans(plansRes.data as SaaSPlan[]);
    }

    load();
  }, [router]);

  if (!mounted || !session) return <AdminSkeleton />;
  if (session.role !== 'ADMIN') return <AdminSkeleton />;

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const saveMonetization = async () => {
    const supabase = createClient();
    await supabase.from('platform_settings').upsert({ key: 'monetization', value: settings });
    mockStorage.saveMonetizationSettings(settings);
    flash('Monetization settings saved.');
  };

  const updatePlan = (id: string, patch: Partial<SaaSPlan>) => {
    setPlans(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const savePlans = async () => {
    const supabase = createClient();
    for (const p of plans) {
      await supabase.from('plans').upsert(p);
      mockStorage.savePlan(p);
    }
    flash('Plan configuration saved.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monetization Settings"
        subtitle="Configure platform fees, advertising and SaaS plan pricing & limits"
        icon="tune"
        backHref="/admin/revenue"
      />

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {msg}
        </div>
      )}

      {/* Platform fee */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">percent</span>
              Platform Service Fee
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Charged transparently on completed rentals. Recorded as PLATFORM_FEE — separate from owner rental revenue.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-on-surface-variant">Enabled</span>
            <div
              onClick={() => setSettings({ ...settings, platformFeeEnabled: !settings.platformFeeEnabled })}
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${settings.platformFeeEnabled ? 'bg-primary' : 'bg-outline'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.platformFeeEnabled ? 'left-5' : 'left-1'}`} />
            </div>
          </label>
        </div>

        {settings.platformFeeEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Fee Type</label>
              <select
                value={settings.platformFeeType}
                onChange={e => setSettings({ ...settings, platformFeeType: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              >
                <option value="PERCENTAGE">Percentage of rental amount</option>
                <option value="FIXED">Fixed amount per completed rental</option>
                <option value="NONE">No fee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                {settings.platformFeeType === 'PERCENTAGE' ? 'Fee (%)' : 'Fee (₹)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.platformFeeValue}
                onChange={e => setSettings({ ...settings, platformFeeValue: Number(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button onClick={saveMonetization} className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:opacity-90 transition-all">
            Save Platform Fee
          </button>
        </div>
      </div>

      {/* Advertising */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">campaign</span>
              Advertising
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Ads are shown to Free-plan users only; Pro/Business plans are ad-free (configurable per plan).
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-semibold text-on-surface-variant">Enabled</span>
            <div
              onClick={() => setSettings({ ...settings, advertisingEnabled: !settings.advertisingEnabled })}
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${settings.advertisingEnabled ? 'bg-primary' : 'bg-outline'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.advertisingEnabled ? 'left-5' : 'left-1'}`} />
            </div>
          </label>
        </div>
        <div className="pt-2 flex justify-end">
          <button onClick={saveMonetization} className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:opacity-90 transition-all">
            Save Advertising
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">workspace_premium</span>
          SaaS Plans & Limits
        </h2>
        <p className="text-xs text-on-surface-variant">
          Configuration values only — changing these does not require code changes. Price shown per month.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Price ₹/mo</th>
                <th className="py-3 px-3">Vehicles</th>
                <th className="py-3 px-3">Staff</th>
                <th className="py-3 px-3 text-center">GPS</th>
                <th className="py-3 px-3 text-center">Adv. Reports</th>
                <th className="py-3 px-3 text-center">Branding</th>
                <th className="py-3 px-3 text-center">Ads</th>
                <th className="py-3 px-3 text-center">Priority</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                  <td className="py-3 px-3 font-black text-on-surface">{p.id}</td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={p.priceRupees}
                      onChange={e => updatePlan(p.id, { priceRupees: Number(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-mono"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      min={1}
                      value={p.vehicleLimit}
                      onChange={e => updatePlan(p.id, { vehicleLimit: Number(e.target.value) || 1 })}
                      className="w-16 px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-mono"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      min={0}
                      value={p.staffLimit}
                      onChange={e => updatePlan(p.id, { staffLimit: Number(e.target.value) || 0 })}
                      className="w-14 px-2 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-mono"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input type="checkbox" checked={p.gpsEnabled} onChange={e => updatePlan(p.id, { gpsEnabled: e.target.checked })} className="accent-primary w-4 h-4" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input type="checkbox" checked={p.advancedReports} onChange={e => updatePlan(p.id, { advancedReports: e.target.checked })} className="accent-primary w-4 h-4" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input type="checkbox" checked={p.customBranding} onChange={e => updatePlan(p.id, { customBranding: e.target.checked })} className="accent-primary w-4 h-4" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input type="checkbox" checked={p.adsEnabled} onChange={e => updatePlan(p.id, { adsEnabled: e.target.checked })} className="accent-primary w-4 h-4" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input type="checkbox" checked={p.prioritySupport} onChange={e => updatePlan(p.id, { prioritySupport: e.target.checked })} className="accent-primary w-4 h-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 flex justify-end">
          <button onClick={savePlans} className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:opacity-90 transition-all">
            Save Plans
          </button>
        </div>
      </div>

      {/* Enterprise */}
      <div className="p-6 rounded-2xl border border-dashed border-primary/40 bg-primary-container/10 space-y-2">
        <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">apartment</span>
          Enterprise & White Label
        </h2>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Custom pricing, custom domain, white-label, API access and dedicated support for large rental companies,
          multi-branch fleet operators and tourism firms. Contact sales for a bespoke contract.
        </p>
      </div>
    </div>
  );
}
