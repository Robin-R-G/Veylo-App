'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FeatureFlags, AdConfiguration } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AdminControlPage() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    onlinePayment: true,
    marketplaceSettlement: false,
    commission: false,
    gst: false,
    advertising: true,
    subscriptions: true,
    aiInsights: true,
    maintenance: true,
    gpsTracking: true,
  });

  const [adConfigs, setAdConfigs] = useState<AdConfiguration[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'flags' | 'ads' | 'payment' | 'logs'>('overview');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    async function load() {
      const [flagsRes, adsRes] = await Promise.all([
        supabase.from('platform_settings').select('value').eq('key', 'feature_flags').single(),
        supabase.from('ad_configurations').select('*').order('placement'),
      ]);

      if (flagsRes.data?.value) setFeatureFlags(flagsRes.data.value as FeatureFlags);
      if (adsRes.data) setAdConfigs(adsRes.data as AdConfiguration[]);
    }

    load();
  }, []);

  if (!mounted) return null;

  const toggleFlag = async (key: keyof FeatureFlags) => {
    const updated = { ...featureFlags, [key]: !featureFlags[key] };
    setFeatureFlags(updated);

    const supabase = createClient();
    await supabase.from('platform_settings').upsert({ key: 'feature_flags', value: updated });

    setSaveSuccessMsg(`Feature flag '${key}' updated.`);
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Admin Control Center"
        subtitle="Manage platform operations, capability flags, advertising zones & system settings"
        icon="admin_panel_settings"
        action={
          <Link
            href="/admin/fuel-rates"
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-sm">local_gas_station</span>
            Fuel Price Management →
          </Link>
        }
      />

      {saveSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {saveSuccessMsg}
        </div>
      )}

      {/* Top Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Platform Users</span>
            <span className="material-symbols-outlined text-primary text-sm">group</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">1</p>
          <span className="text-[10px] text-on-surface-variant">Active Super Admin</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Registered Fleet</span>
            <span className="material-symbols-outlined text-primary text-sm">directions_car</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">1</p>
          <span className="text-[10px] text-on-surface-variant">KL 16 P 78</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Total Rides</span>
            <span className="material-symbols-outlined text-primary text-sm">route</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">1</p>
          <span className="text-[10px] text-on-surface-variant">Recorded ODO journeys</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">UPI Payee ID</span>
            <span className="material-symbols-outlined text-primary text-sm">payments</span>
          </div>
          <p className="text-lg font-bold text-primary">owner@upi</p>
          <span className="text-[10px] text-on-surface-variant">Direct UPI Intent</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'overview' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">space_dashboard</span>
          Overview
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'flags' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">toggle_on</span>
          Feature Flags
        </button>

        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'ads' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-sm">campaign</span>
          Ad Placements
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
            <h2 className="text-base font-bold text-on-surface">Platform Capabilities Summary</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-on-surface">Live Indian Fuel Price API</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">ACTIVE</span>
                </div>
                <p className="text-on-surface-variant text-[11px]">Integrated with https://fuel.indianapi.in hiding API key server-side.</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-on-surface">Direct UPI Intent Payments</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">ACTIVE</span>
                </div>
                <p className="text-on-surface-variant text-[11px]">Generates upi://pay deep-links with zero bank PIN asking.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEATURE FLAGS */}
      {activeTab === 'flags' && (
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-on-surface">System Feature Flags</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Control capability toggles safely across multi-tenant environments</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'onlinePayment', label: 'Online Payment Gateway', desc: 'Enable mock / real payment checkout' },
              { key: 'gst', label: 'GST Tax Calculation Engine', desc: 'Disabled by default until legal business setup exists' },
              { key: 'advertising', label: 'Advertising Engine', desc: 'Render AdSlot components for free tier users' },
              { key: 'subscriptions', label: 'Freemium Subscriptions', desc: 'Enforce FREE, PRO, and BUSINESS tier limits' },
              { key: 'commission', label: 'Platform Commission Engine', desc: 'Enable platform commission calculations' },
              { key: 'marketplaceSettlement', label: 'Marketplace Split Payments', desc: 'Direct owner settlement via payment provider' },
              { key: 'aiInsights', label: 'AI Vehicle Insights', desc: 'Generate vehicle usage trends & maintenance tips' },
              { key: 'maintenance', label: 'Maintenance Tracker', desc: 'Enable service logging & health score calculation' },
            ].map((item) => {
              const flagKey = item.key as keyof FeatureFlags;
              const isEnabled = featureFlags[flagKey];
              return (
                <div key={item.key} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{item.label}</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</p>
                  </div>

                  <button
                    onClick={() => toggleFlag(flagKey)}
                    className="p-1 text-primary hover:opacity-80 transition-opacity"
                  >
                    <span className={`material-symbols-outlined text-3xl ${isEnabled ? 'text-primary' : 'text-outline'}`}>
                      {isEnabled ? 'toggle_on' : 'toggle_off'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AD PLACEMENTS */}
      {activeTab === 'ads' && (
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-on-surface">Advertising Slot Placements</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Predefined non-intrusive ad zones with automatic Pro entitlement removal</p>
          </div>

          <div className="space-y-4">
            {adConfigs.map((config) => (
              <div key={config.id} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{config.placement}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Pro Users Excluded (Ad-Free)
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-on-surface">{config.bannerTitle}</h4>
                <p className="text-[11px] text-on-surface-variant">{config.bannerText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
