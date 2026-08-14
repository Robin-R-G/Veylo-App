'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { FuelPrice } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

export default function FuelRatesPage() {
  const [petrol, setPetrol] = useState<FuelPrice | null>(null);
  const [diesel, setDiesel] = useState<FuelPrice | null>(null);
  const [cng, setCng] = useState<FuelPrice | null>(null);

  const [petrolInput, setPetrolInput] = useState<number>(104.20);
  const [dieselInput, setDieselInput] = useState<number>(96.80);
  const [cngInput, setCngInput] = useState<number>(85.00);
  const [stateInput, setStateInput] = useState('Kerala');
  const [cityInput, setCityInput] = useState('Kozhikode');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [history, setHistory] = useState<FuelPrice[]>([]);
  const [mounted, setMounted] = useState(false);

  const loadPrices = async (refresh = false) => {
    setIsRefreshing(true);
    try {
      const p = await fuelPriceService.getLatestFuelPrice('PETROL', stateInput, cityInput, refresh);
      const d = await fuelPriceService.getLatestFuelPrice('DIESEL', stateInput, cityInput, refresh);
      const c = await fuelPriceService.getLatestFuelPrice('CNG', stateInput, cityInput, refresh);

      setPetrol(p);
      setDiesel(d);
      setCng(c);

      setPetrolInput(p.priceRupees);
      setDieselInput(d.priceRupees);
      setCngInput(c.priceRupees);

      const hist = fuelPriceService.getHistory();
      setHistory(hist);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadPrices();
  }, []);

  if (!mounted) return null;

  const handleManualOverride = (e: React.FormEvent) => {
    e.preventDefault();
    fuelPriceService.updateManualOverride('PETROL', Number(petrolInput), stateInput, cityInput);
    fuelPriceService.updateManualOverride('DIESEL', Number(dieselInput), stateInput, cityInput);
    fuelPriceService.updateManualOverride('CNG', Number(cngInput), stateInput, cityInput);

    setSaveSuccessMsg('Fuel prices updated across application.');
    loadPrices();
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Fuel Rates"
        subtitle="Manage current petrol and diesel prices used for vehicle billing."
        backHref="/admin"
        icon="local_gas_station"
        action={
          <button
            onClick={() => loadPrices(true)}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-lg bg-surface border border-outline-variant text-primary font-semibold text-xs flex items-center gap-1.5 hover:bg-surface-container-low transition-all shadow-sm"
          >
            <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
            Fetch Live API Rates
          </button>
        }
      />

      {saveSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {saveSuccessMsg}
        </div>
      )}

      {/* Main Cards Grid (PETROL, DIESEL, CNG) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* PETROL CARD */}
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-3">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">PETROL</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Verified
            </span>
          </div>

          <div>
            <p className="text-3xl font-extrabold text-primary">₹{(petrol?.priceRupees || 104.20).toFixed(2)} <span className="text-sm font-normal text-on-surface-variant">/ L</span></p>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {petrol?.city || 'Kozhikode'}, {petrol?.state || 'Kerala'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Updated {petrol ? new Date(petrol.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10 minutes ago'}
            </p>
          </div>
        </div>

        {/* DIESEL CARD */}
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-3">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">DIESEL</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Verified
            </span>
          </div>

          <div>
            <p className="text-3xl font-extrabold text-primary">₹{(diesel?.priceRupees || 96.80).toFixed(2)} <span className="text-sm font-normal text-on-surface-variant">/ L</span></p>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {diesel?.city || 'Kozhikode'}, {diesel?.state || 'Kerala'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Updated {diesel ? new Date(diesel.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10 minutes ago'}
            </p>
          </div>
        </div>

        {/* CNG CARD */}
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-3">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">CNG</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Verified
            </span>
          </div>

          <div>
            <p className="text-3xl font-extrabold text-primary">₹{(cng?.priceRupees || 85.00).toFixed(2)} <span className="text-sm font-normal text-on-surface-variant">/ kg</span></p>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {cng?.city || 'Kozhikode'}, {cng?.state || 'Kerala'}
            </p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Updated {cng ? new Date(cng.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10 minutes ago'}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Override Form */}
      <form onSubmit={handleManualOverride} className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <div className="border-b border-outline-variant pb-2">
          <h3 className="font-bold text-base text-on-surface">Update Regional Rates</h3>
          <p className="text-xs text-on-surface-variant">Publish rate overrides for specific Indian states & cities</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">State</label>
            <input
              type="text"
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">City</label>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Petrol Rate (₹/L)</label>
            <input
              type="number"
              step="0.01"
              value={petrolInput}
              onChange={(e) => setPetrolInput(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant font-bold text-primary"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Diesel Rate (₹/L)</label>
            <input
              type="number"
              step="0.01"
              value={dieselInput}
              onChange={(e) => setDieselInput(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant font-bold text-primary"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">CNG Rate (₹/kg)</label>
            <input
              type="number"
              step="0.01"
              value={cngInput}
              onChange={(e) => setCngInput(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface-container-low border border-outline-variant font-bold text-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-xs shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
        >
          Publish Fuel Price Override
        </button>
      </form>

      {/* Fuel Price History Table */}
      <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <h3 className="font-bold text-base text-on-surface">Fuel Price History</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Fuel Type</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                  <td className="py-2.5 px-3 font-mono">{new Date(h.fetchedAt).toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-semibold">{h.fuelType}</td>
                  <td className="py-2.5 px-3 font-bold text-primary">₹{h.priceRupees.toFixed(2)}</td>
                  <td className="py-2.5 px-3">{h.city}, {h.state}</td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-on-surface-variant">{h.source}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {h.status}
                    </span>
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
