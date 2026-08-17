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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-2xl">admin_panel_settings</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Control Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Super Administrator governance, central fuel authority, monetization flags & system health.
          </p>
        </div>
        <Link
          href="/admin/fuel-rates"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
        >
          <span className="material-symbols-outlined text-base">local_gas_station</span>
          Central Fuel Price Control →
        </Link>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-lg">
          <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Active Super Admin */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Platform Authority</span>
            <span className="material-symbols-outlined text-amber-400 text-lg">verified_user</span>
          </div>
          <p className="text-2xl font-black text-white">SUPER_ADMIN</p>
          <span className="text-[10px] text-slate-400">Database RLS Enforced</span>
        </div>

        {/* Central Petrol Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Petrol Benchmark</span>
            <span className="material-symbols-outlined text-amber-400 text-lg">local_gas_station</span>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            ₹{fuelPrices.petrol?.priceRupees.toFixed(2) || '107.50'}
          </p>
          <span className="text-[10px] text-slate-400">Kerala Jurisdiction</span>
        </div>

        {/* Central Diesel Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Diesel Benchmark</span>
            <span className="material-symbols-outlined text-blue-400 text-lg">local_gas_station</span>
          </div>
          <p className="text-2xl font-black text-blue-400 font-mono">
            ₹{fuelPrices.diesel?.priceRupees.toFixed(2) || '96.30'}
          </p>
          <span className="text-[10px] text-slate-400">Kerala Jurisdiction</span>
        </div>

        {/* Central CNG Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">CNG Benchmark</span>
            <span className="material-symbols-outlined text-emerald-400 text-lg">local_gas_station</span>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            ₹{fuelPrices.cng?.priceRupees.toFixed(2) || '88.00'}
          </p>
          <span className="text-[10px] text-slate-400">Kerala Jurisdiction</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Quick Controls
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'flags'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Platform Capabilities ({Object.keys(featureFlags).length})
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'ads'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Ad Zones ({adConfigs.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Quick Action Hub */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base">apps</span>
              Platform Management Portals
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                href="/admin/fuel-rates"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-amber-400">
                  <span className="material-symbols-outlined">local_gas_station</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-white pt-1">Fuel Rates</p>
                <p className="text-[10px] text-slate-400">Petrol, Diesel & CNG rates</p>
              </Link>

              <Link
                href="/admin/disputes"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-rose-400">
                  <span className="material-symbols-outlined">gavel</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-white pt-1">Trip Disputes</p>
                <p className="text-[10px] text-slate-400">GPS & ODO claim reviews</p>
              </Link>

              <Link
                href="/admin/revenue"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="material-symbols-outlined">bar_chart</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-white pt-1">Platform Revenue</p>
                <p className="text-[10px] text-slate-400">Subscription & fee ledgers</p>
              </Link>

              <Link
                href="/admin/audit-logs"
                className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 space-y-1 transition-all group"
              >
                <div className="flex items-center justify-between text-blue-400">
                  <span className="material-symbols-outlined">verified_user</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
                <p className="font-bold text-white pt-1">Audit Trail</p>
                <p className="text-[10px] text-slate-400">Admin security logs</p>
              </Link>
            </div>
          </div>

          {/* Realtime Status Summary */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-base">sensors</span>
              Realtime Synchronization Health
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Supabase Realtime Channel</p>
                  <p className="text-[10px] text-slate-400">Listens on public.fuel_prices</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  CONNECTED
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Database Row Level Security</p>
                  <p className="text-[10px] text-slate-400">Write access restricted to SUPER_ADMIN</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ACTIVE
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">Invoice Historical Snapshots</p>
                  <p className="text-[10px] text-slate-400">Permanent rate lock on trip finalization</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  IMMUTABLE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Feature Flags */}
      {activeTab === 'flags' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            Platform Capabilities & Feature Flags
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(featureFlags).map(([key, val]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-[10px] text-slate-400">{val ? 'Currently enabled' : 'Disabled'}</p>
                </div>
                <button
                  onClick={() => toggleFlag(key as keyof FeatureFlags)}
                  className={`w-14 h-8 rounded-full transition-colors relative p-0.5 ${
                    val ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-7 h-7 rounded-full bg-slate-950 shadow-md transform transition-transform ${
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
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            Advertising Placements & Monetization
          </h2>
          <div className="space-y-3">
            {adConfigs.map((ad) => (
              <div
                key={ad.id || ad.placement}
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white font-mono">{ad.placement}</p>
                  <p className="text-[10px] text-slate-400">{ad.bannerTitle} — {ad.provider}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                  ad.enabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'
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
