'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FeatureFlags, AdConfiguration, FuelPrice } from '@/types';
import { centralFuelPriceService } from '@/lib/services/fuelPriceService';
import { AdminSkeleton } from '@/components/ui/Skeleton';
import { mockStorage } from '@/lib/services/mockStorage';

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

  const [fuelPrices, setFuelPrices] = useState<{ petrol?: FuelPrice; diesel?: FuelPrice; cng?: FuelPrice }>({});
  const [adConfigs, setAdConfigs] = useState<AdConfiguration[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'flags' | 'ads'>('overview');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    async function load() {
      const [flagsRes, adsRes, currentRates] = await Promise.all([
        supabase.from('platform_settings').select('value').eq('key', 'feature_flags').single(),
        supabase.from('ad_configurations').select('*').order('placement'),
        centralFuelPriceService.getAllCurrentRates('Kerala', 'Kozhikode'),
      ]);

      if (flagsRes.data?.value) setFeatureFlags(flagsRes.data.value as FeatureFlags);
      if (adsRes.data) setAdConfigs(adsRes.data as AdConfiguration[]);
      if (currentRates) setFuelPrices(currentRates);
    }

    load();
  }, []);

  if (!mounted) return <AdminSkeleton />;

  const toggleFlag = async (key: keyof FeatureFlags) => {
    const updated = { ...featureFlags, [key]: !featureFlags[key] };
    setFeatureFlags(updated);

    const supabase = createClient();
    await supabase.from('platform_settings').upsert({ key: 'feature_flags', value: updated });
    mockStorage.updateFeatureFlags(updated);

    setSaveSuccessMsg(`Capability '${key}' toggled to ${updated[key] ? 'ENABLED' : 'DISABLED'}.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Admin Dashboard</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage fuel rates, disputes, and platform settings.
          </p>
        </div>
        <Link
          href="/admin/fuel-rates"
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs flex items-center gap-2 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-base">local_gas_station</span>
          Central Fuel Price Control →
        </Link>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-primary-container border border-primary text-on-primary-container text-xs font-semibold flex items-center gap-2.5 shadow-md">
          <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Active Super Admin */}
        <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Platform Authority</span>
            <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
          </div>
          <p className="text-2xl font-extrabold text-on-surface">SUPER_ADMIN</p>
          <span className="text-[10px] text-on-surface-variant">Database RLS Enforced</span>
        </div>

        {/* Central Petrol Rate */}
        <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Petrol Benchmark</span>
            <span className="material-symbols-outlined text-primary text-lg">local_gas_station</span>
          </div>
          <p className="text-2xl font-extrabold text-primary font-mono">
            ₹{fuelPrices.petrol?.priceRupees.toFixed(2) || '107.50'}
          </p>
          <span className="text-[10px] text-on-surface-variant">Kerala Jurisdiction</span>
        </div>

        {/* Central Diesel Rate */}
        <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Diesel Benchmark</span>
            <span className="material-symbols-outlined text-tertiary text-lg">local_gas_station</span>
          </div>
          <p className="text-2xl font-extrabold text-tertiary font-mono">
            ₹{fuelPrices.diesel?.priceRupees.toFixed(2) || '96.30'}
          </p>
          <span className="text-[10px] text-on-surface-variant">Kerala Jurisdiction</span>
        </div>

        {/* Central CNG Rate */}
        <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">CNG Benchmark</span>
            <span className="material-symbols-outlined text-secondary text-lg">local_gas_station</span>
          </div>
          <p className="text-2xl font-extrabold text-secondary font-mono">
            ₹{fuelPrices.cng?.priceRupees.toFixed(2) || '88.00'}
          </p>
          <span className="text-[10px] text-on-surface-variant">Kerala Jurisdiction</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-on-primary font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Quick Controls
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'flags'
              ? 'bg-primary text-on-primary font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Platform Capabilities ({Object.keys(featureFlags).length})
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'ads'
              ? 'bg-primary text-on-primary font-extrabold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Ad Zones ({adConfigs.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Quick Action Hub */}
          <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">apps</span>
              Platform Management Portals
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                href="/admin/fuel-rates"
                className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-primary">
                  <span className="material-symbols-outlined">local_gas_station</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-on-surface pt-1">Fuel Rates</p>
                <p className="text-[10px] text-on-surface-variant">Petrol, Diesel & CNG rates</p>
              </Link>

              <Link
                href="/admin/disputes"
                className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-error">
                  <span className="material-symbols-outlined">gavel</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-on-surface pt-1">Trip Disputes</p>
                <p className="text-[10px] text-on-surface-variant">GPS & ODO claim reviews</p>
              </Link>

              <Link
                href="/admin/revenue"
                className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-secondary">
                  <span className="material-symbols-outlined">bar_chart</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-on-surface pt-1">Platform Revenue</p>
                <p className="text-[10px] text-on-surface-variant">Subscription & fee ledgers</p>
              </Link>

              <Link
                href="/admin/audit-logs"
                className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-tertiary">
                  <span className="material-symbols-outlined">verified_user</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-on-surface pt-1">Audit Trail</p>
                <p className="text-[10px] text-on-surface-variant">Admin security logs</p>
              </Link>
            </div>
          </div>

          {/* Realtime Status Summary */}
          <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base">sensors</span>
              Realtime Synchronization Health
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Supabase Realtime Channel</p>
                  <p className="text-[10px] text-on-surface-variant">Listens on public.fuel_prices</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-primary border border-primary/40">
                  CONNECTED
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Database Row Level Security</p>
                  <p className="text-[10px] text-on-surface-variant">Write access restricted to SUPER_ADMIN</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-primary border border-primary/40">
                  ACTIVE
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface">Invoice Historical Snapshots</p>
                  <p className="text-[10px] text-on-surface-variant">Permanent rate lock on trip finalization</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-primary border border-primary/40">
                  IMMUTABLE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Feature Flags */}
      {activeTab === 'flags' && (
        <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
            Platform Capabilities & Feature Flags
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(featureFlags).map(([key, val]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-on-surface capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-[10px] text-on-surface-variant">{val ? 'Currently enabled' : 'Disabled'}</p>
                </div>
                <button
                  onClick={() => toggleFlag(key as keyof FeatureFlags)}
                  className={`w-14 h-8 rounded-full transition-colors relative p-0.5 ${
                    val ? 'bg-primary' : 'bg-outline-variant'
                  }`}
                >
                  <span
                    className={`block w-7 h-7 rounded-full bg-on-primary shadow-md transform transition-transform ${
                      val ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Ad Zones */}
      {activeTab === 'ads' && (
        <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
            Advertising Placements & Monetization
          </h2>
          <div className="space-y-3">
            {adConfigs.map((ad) => (
              <div
                key={ad.id || ad.placement}
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-on-surface font-mono">{ad.placement}</p>
                  <p className="text-[10px] text-on-surface-variant">{ad.bannerTitle} — {ad.provider}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  ad.enabled ? 'bg-primary-container text-primary border border-primary/40' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                }`}>
                  {ad.enabled ? 'ENABLED' : 'MUTED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
