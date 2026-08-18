'use client';

import React, { useState, useEffect } from 'react';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';
import { centralFuelPriceService, fuelRealtimeService } from '@/lib/services/fuelPriceService';
import { FuelType } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TripEstimatorPage() {
  const [startOdo, setStartOdo] = useState<number>(12500);
  const [endOdo, setEndOdo] = useState<number>(12508);
  const [mileage, setMileage] = useState<number>(40);
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [fuelPrice, setFuelPrice] = useState<number>(107.50);
  const [unit, setUnit] = useState<'LITRE' | 'KG'>('LITRE');
  const [mode, setMode] = useState<'FUEL_COST' | 'PER_KM' | 'FUEL_PLUS_PER_KM'>('FUEL_COST');
  const [perKmRate, setPerKmRate] = useState<number>(3);
  const [mounted, setMounted] = useState(false);

  const loadRateForType = async (type: FuelType) => {
    const rate = await centralFuelPriceService.getLatestFuelPrice(type, 'Kerala', 'Kozhikode');
    if (rate) {
      const rawPrice = Number(rate.priceRupees || (rate.pricePerUnitPaise ? rate.pricePerUnitPaise / 100 : 0));
      const rupees = rawPrice > 500 ? rawPrice / 100 : rawPrice;
      setFuelPrice(rupees);
      setUnit(rate.unit);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadRateForType(fuelType);

    const unsubscribe = fuelRealtimeService.subscribe((updated) => {
      if (updated.fuelType === fuelType) {
        const rawPrice = Number(updated.priceRupees || (updated.pricePerUnitPaise ? updated.pricePerUnitPaise / 100 : 0));
        const rupees = rawPrice > 500 ? rawPrice / 100 : rawPrice;
        setFuelPrice(rupees);
        setUnit(updated.unit);
      }
    });

    return () => unsubscribe();
  }, [fuelType]);

  if (!mounted) return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-7 w-64" />
      <div className="bg-surface rounded-xl p-6 border border-outline-variant space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );

  const startNum = Number(startOdo || 0);
  const endNum = Number(endOdo || 0);
  const isInvalidOdo = endNum < startNum;
  const safeEndNum = Math.max(startNum, endNum);
  const dist = safeEndNum - startNum;

  const rawPriceNum = Number(fuelPrice || 0);
  const normalizedPriceRupees = rawPriceNum > 500 ? rawPriceNum / 100 : rawPriceNum;

  const result = calculateRideCosts({
    startOdometer: startNum,
    endOdometer: safeEndNum,
    mileageKmpl: Number(mileage || 1),
    fuelPricePaise: Math.round(normalizedPriceRupees * 100),
    pricingMode: mode,
    perKmRateRupees: Number(perKmRate || 0),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Page Header */}
      <PageHeader
        title="Trip Cost Estimator"
        subtitle="Calculate exact fuel expenses, distance, and payable amounts using live platform benchmark rates"
        backHref="/dashboard"
        icon="calculate"
      />

      <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm space-y-6">
        
        {/* Fuel Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-2">Select Vehicle Fuel Type</label>
          <div className="grid grid-cols-3 gap-3">
            {(['PETROL', 'DIESEL', 'CNG'] as FuelType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFuelType(type);
                  if (type === 'CNG') setMileage(30);
                  else if (type === 'DIESEL') setMileage(18);
                  else setMileage(40);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  fuelType === type
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-sm">local_gas_station</span>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Start Odometer Reading (KM)</label>
            <input
              type="number"
              value={startOdo}
              onChange={(e) => setStartOdo(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">End Odometer Reading (KM)</label>
            <input
              type="number"
              value={endOdo}
              onChange={(e) => setEndOdo(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-primary text-sm font-bold"
            />
          </div>
        </div>

        {isInvalidOdo && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-500">warning</span>
            <span>End odometer reading ({endNum} km) cannot be less than start reading ({startNum} km). Distance set to 0 km.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Vehicle Mileage ({fuelType === 'CNG' ? 'km/kg' : 'km/L'})
            </label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Platform Canonical {fuelType} Rate (₹/{unit === 'KG' ? 'kg' : 'L'})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-primary text-sm font-bold"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                Live
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">Pricing Model</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-sm font-semibold"
          >
            <option value="FUEL_COST">Fuel Expense Only (Mileage & Canonical Fuel Price)</option>
            <option value="PER_KM">Flat Per-KM Rental Rate</option>
            <option value="FUEL_PLUS_PER_KM">Combined (Fuel Cost + Per-KM Base Fee)</option>
          </select>
        </div>

        {mode !== 'FUEL_COST' && (
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Per-KM Rental Rate (₹)</label>
            <input
              type="number"
              step="0.5"
              value={perKmRate}
              onChange={(e) => setPerKmRate(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-sm font-semibold"
            />
          </div>
        )}

        {/* Calculation Result Summary Card */}
        <div className="p-5 rounded-xl bg-surface-container border border-outline-variant space-y-3">
          <div className="flex justify-between items-center text-xs text-on-surface-variant">
            <span>Distance Covered:</span>
            <span className="font-bold text-on-surface">{dist} km</span>
          </div>

          <div className="flex justify-between items-center text-xs text-on-surface-variant">
            <span>Fuel Consumed ({fuelType}):</span>
            <span className="font-bold text-on-surface">{result.estimatedFuelLitres.toFixed(2)} {unit === 'KG' ? 'kg' : 'L'}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-on-surface-variant">
            <span>Calculated Fuel Cost:</span>
            <span className="font-bold text-on-surface">{formatCurrency(result.estimatedFuelCostRupees)}</span>
          </div>

          <div className="border-t border-outline-variant pt-3 flex justify-between items-center">
            <span className="text-sm font-bold text-on-surface">Total Payable Estimate:</span>
            <span className="text-2xl font-extrabold text-primary">{formatCurrency(result.totalAmountRupees)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
