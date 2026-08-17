'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { centralFuelPriceService, adminFuelService, fuelRealtimeService } from '@/lib/services/fuelPriceService';
import { FuelPrice, FuelPriceHistoryItem, FuelPriceAuditLog, FuelType } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminSkeleton } from '@/components/ui/Skeleton';

export default function AdminFuelRatesPage() {
  const [petrol, setPetrol] = useState<FuelPrice | null>(null);
  const [diesel, setDiesel] = useState<FuelPrice | null>(null);
  const [cng, setCng] = useState<FuelPrice | null>(null);

  const [stateInput, setStateInput] = useState('Kerala');
  const [cityInput, setCityInput] = useState('Kozhikode');

  const [petrolInput, setPetrolInput] = useState<string>('107.50');
  const [dieselInput, setDieselInput] = useState<string>('96.30');
  const [cngInput, setCngInput] = useState<string>('88.00');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [history, setHistory] = useState<FuelPriceHistoryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<FuelPriceAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'audit'>('history');
  const [mounted, setMounted] = useState(false);

  const loadCurrentRates = useCallback(async (refresh = false) => {
    setIsRefreshing(true);
    setErrorMsg('');
    try {
      const [p, d, c] = await Promise.all([
        centralFuelPriceService.getLatestFuelPrice('PETROL', stateInput, cityInput, refresh),
        centralFuelPriceService.getLatestFuelPrice('DIESEL', stateInput, cityInput, refresh),
        centralFuelPriceService.getLatestFuelPrice('CNG', stateInput, cityInput, refresh),
      ]);

      setPetrol(p);
      setDiesel(d);
      setCng(c);

      setPetrolInput(p.priceRupees.toFixed(2));
      setDieselInput(d.priceRupees.toFixed(2));
      setCngInput(c.priceRupees.toFixed(2));

      const [histData, auditData] = await Promise.all([
        adminFuelService.getHistory(30),
        adminFuelService.getAuditLogs(30),
      ]);
      setHistory(histData);
      setAuditLogs(auditData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load fuel rates.');
    } finally {
      setIsRefreshing(false);
    }
  }, [stateInput, cityInput]);

  useEffect(() => {
    setMounted(true);
    loadCurrentRates();

    const unsubscribe = fuelRealtimeService.subscribe((updated) => {
      if (updated.state === stateInput && updated.city === cityInput) {
        if (updated.fuelType === 'PETROL') setPetrol(updated);
        if (updated.fuelType === 'DIESEL') setDiesel(updated);
        if (updated.fuelType === 'CNG') setCng(updated);
      }
    });

    return () => unsubscribe();
  }, [loadCurrentRates, stateInput, cityInput]);

  if (!mounted) return <AdminSkeleton />;

  const handleFetchLiveApi = async () => {
    setIsRefreshing(true);
    setErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const result = await adminFuelService.fetchAndPublishLiveRates(stateInput, cityInput);
      if (result.success) {
        setSaveSuccessMsg('Live market rates fetched and published to central database.');
        await loadCurrentRates();
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setErrorMsg(result.error || 'Live API provider unavailable.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'API request failed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConfirmOverride = async () => {
    setIsPublishing(true);
    setErrorMsg('');
    setShowConfirmModal(false);

    const p = parseFloat(petrolInput);
    const d = parseFloat(dieselInput);
    const c = parseFloat(cngInput);

    if (isNaN(p) || p <= 0 || isNaN(d) || d <= 0 || isNaN(c) || c <= 0) {
      setErrorMsg('All prices must be valid positive numbers greater than ₹0.');
      setIsPublishing(false);
      return;
    }

    const result = await adminFuelService.publishManualOverride({
      state: stateInput,
      city: cityInput,
      petrolRupees: p,
      dieselRupees: d,
      cngRupees: c,
    });

    if (result.success) {
      setSaveSuccessMsg(`Published: Petrol ₹${p.toFixed(2)}, Diesel ₹${d.toFixed(2)}, CNG ₹${c.toFixed(2)} (${cityInput}, ${stateInput})`);
      await loadCurrentRates();
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } else {
      setErrorMsg(result.error || 'Failed to publish fuel rate update.');
    }
    setIsPublishing(false);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container text-primary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            LIVE RATE
          </span>
        );
      case 'RECENT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary-container text-on-surface flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            VERIFIED BENCHMARK
          </span>
        );
      case 'STALE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-surface flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            CACHED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">local_gas_station</span>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Fuel Rates</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Centrally control Petrol, Diesel, and CNG rates. Changes immediately propagate to Owners & Riders in real time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchLiveApi}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base text-primary ${isRefreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            Fetch Live Market Rates
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-primary-container border border-primary text-on-primary-container text-xs font-semibold flex items-center gap-2.5 shadow-md">
          <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container border border-error/40 text-on-error-container text-xs font-semibold flex items-center gap-2.5 shadow-md">
          <span className="material-symbols-outlined text-lg shrink-0">warning</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Location Filter */}
      <div className="p-4 rounded-2xl bg-surface border border-outline-variant flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">location_on</span>
          <span className="text-xs font-bold text-on-surface">Active Jurisdiction:</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="Kerala">Kerala</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Delhi">Delhi</option>
          </select>
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="City (e.g. Kozhikode)"
            className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary w-36"
          />
          <button
            onClick={() => loadCurrentRates(true)}
            className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs transition-all"
          >
            Load
          </button>
        </div>
      </div>

      {/* Three Prominent Fuel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PETROL CARD */}
        <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold tracking-wider text-primary uppercase">PETROL</span>
            {getStatusBadge(petrol?.status)}
          </div>
          <div>
            <p className="text-4xl font-extrabold text-on-surface tracking-tight">
              ₹{petrol ? petrol.priceRupees.toFixed(2) : '---'}
              <span className="text-sm font-medium text-on-surface-variant ml-1.5">/ {petrol?.unit || 'LITRE'}</span>
            </p>
            <p className="text-xs font-medium text-on-surface-variant mt-2">
              {petrol ? `${petrol.city}, ${petrol.state}` : 'Kerala Jurisdiction'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
              Source: {petrol?.sourceName || 'Central Authority'} • {petrol ? new Date(petrol.updatedAt).toLocaleTimeString() : ''}
            </p>
          </div>
        </div>

        {/* DIESEL CARD */}
        <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold tracking-wider text-tertiary uppercase">DIESEL</span>
            {getStatusBadge(diesel?.status)}
          </div>
          <div>
            <p className="text-4xl font-extrabold text-on-surface tracking-tight">
              ₹{diesel ? diesel.priceRupees.toFixed(2) : '---'}
              <span className="text-sm font-medium text-on-surface-variant ml-1.5">/ {diesel?.unit || 'LITRE'}</span>
            </p>
            <p className="text-xs font-medium text-on-surface-variant mt-2">
              {diesel ? `${diesel.city}, ${diesel.state}` : 'Kerala Jurisdiction'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
              Source: {diesel?.sourceName || 'Central Authority'} • {diesel ? new Date(diesel.updatedAt).toLocaleTimeString() : ''}
            </p>
          </div>
        </div>

        {/* CNG CARD */}
        <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold tracking-wider text-secondary uppercase">CNG</span>
            {getStatusBadge(cng?.status)}
          </div>
          <div>
            <p className="text-4xl font-extrabold text-on-surface tracking-tight">
              ₹{cng ? cng.priceRupees.toFixed(2) : '---'}
              <span className="text-sm font-medium text-on-surface-variant ml-1.5">/ {cng?.unit || 'KG'}</span>
            </p>
            <p className="text-xs font-medium text-on-surface-variant mt-2">
              {cng ? `${cng.city}, ${cng.state}` : 'Kerala Jurisdiction'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
              Source: {cng?.sourceName || 'Central Authority'} • {cng ? new Date(cng.updatedAt).toLocaleTimeString() : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Override Central Publishing Panel */}
      <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-5">
        <div className="border-b border-outline-variant pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
              Platform Rate Override Authority
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Set and commit custom canonical rates for Petrol, Diesel, and CNG.
            </p>
          </div>
          <span className="text-[10px] font-mono text-primary bg-primary-container/40 border border-primary/40 px-2.5 py-1 rounded-full">
            ATOMIC TRANSACTION
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowConfirmModal(true);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Petrol Rate (₹ / Litre)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-primary font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={petrolInput}
                  onChange={(e) => setPetrolInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                Diesel Rate (₹ / Litre)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-tertiary font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={dieselInput}
                  onChange={(e) => setDieselInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                CNG Rate (₹ / Kg)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-secondary font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={cngInput}
                  onChange={(e) => setCngInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-on-surface-variant">
              Overrides supersede external APIs until next manual update or live sync.
            </p>
            <button
              type="submit"
              disabled={isPublishing}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">publish</span>
              Review & Publish Rates
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-6 space-y-5 shadow-md">
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <div>
                <h3 className="text-lg font-extrabold text-on-surface">Confirm Fuel Rate Update</h3>
                <p className="text-xs text-on-surface-variant">This action will immediately update rates platform-wide.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Jurisdiction:</span>
                <span className="text-on-surface font-bold">{cityInput}, {stateInput}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Petrol:</span>
                <span className="text-primary font-bold">₹{parseFloat(petrolInput).toFixed(2)} / L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Diesel:</span>
                <span className="text-tertiary font-bold">₹{parseFloat(dieselInput).toFixed(2)} / L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">CNG:</span>
                <span className="text-secondary font-bold">₹{parseFloat(cngInput).toFixed(2)} / kg</span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant">
              All ongoing and newly initiated trips will compute fuel charges against these canonical rates. Existing completed invoices will retain their historical snapshots.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={isPublishing}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
              >
                {isPublishing ? 'Publishing...' : 'Commit Central Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History & Audit Logs Tabs */}
      <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('history')}
              className={`text-xs font-extrabold uppercase tracking-wider pb-1 transition-all ${
                activeTab === 'history'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Price Change History ({history.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`text-xs font-extrabold uppercase tracking-wider pb-1 transition-all ${
                activeTab === 'audit'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Platform Audit Logs ({auditLogs.length})
            </button>
          </div>
        </div>

        {activeTab === 'history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Recorded At</th>
                  <th className="py-3 px-3">Fuel Type</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Jurisdiction</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-on-surface-variant text-xs">
                      No historical price records found.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-on-surface">
                        {new Date(h.recordedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.fuelType === 'PETROL' ? 'bg-primary-container/40 text-primary border border-primary/40' :
                          h.fuelType === 'DIESEL' ? 'bg-tertiary-container/40 text-tertiary border border-tertiary/40' :
                          'bg-secondary-container/40 text-secondary border border-secondary/40'
                        }`}>
                          {h.fuelType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-on-surface">
                        ₹{h.priceRupees.toFixed(2)} <span className="text-[10px] text-on-surface-variant">/ {h.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-on-surface">
                        {h.city}, {h.state}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-on-surface-variant">
                        {h.sourceName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-primary border border-primary/40">
                          VERIFIED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Fuel Type</th>
                  <th className="py-3 px-3">Old Price</th>
                  <th className="py-3 px-3">New Price</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-on-surface-variant text-xs">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-on-surface">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-primary">
                        {log.eventType}
                      </td>
                      <td className="py-3 px-3 font-bold text-on-surface">
                        {log.fuelType}
                      </td>
                      <td className="py-3 px-3 font-mono text-on-surface-variant">
                        {log.oldPriceRupees ? `₹${log.oldPriceRupees.toFixed(2)}` : '---'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-primary">
                        {log.newPriceRupees ? `₹${log.newPriceRupees.toFixed(2)}` : '---'}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant font-mono text-[11px]">
                        {log.sourceName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-primary border border-primary/40">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
