'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function TripEstimatorPage() {
  const [startOdo, setStartOdo] = useState<number>(12500);
  const [endOdo, setEndOdo] = useState<number>(12508);
  const [mileage, setMileage] = useState<number>(40);
  const [fuelPrice, setFuelPrice] = useState<number>(0);

  useEffect(() => {
    const rate = fuelPriceService.getCachedPrice('PETROL', 'Kerala', 'Kozhikode') || 104.20;
    setFuelPrice(rate);
  }, []);

  const [mode, setMode] = useState<'FUEL_COST' | 'PER_KM' | 'FUEL_PLUS_PER_KM'>('FUEL_COST');
  const [perKmRate, setPerKmRate] = useState<number>(3);

  const startNum = Number(startOdo || 0);
  const endNum = Number(endOdo || 0);
  const dist = endNum >= startNum ? endNum - startNum : 0;

  const result = calculateRideCosts({
    startOdometer: startNum,
    endOdometer: endNum,
    mileageKmpl: Number(mileage || 1),
    fuelPricePaise: Math.round(Number(fuelPrice || 0) * 100),
    pricingMode: mode,
    perKmRateRupees: Number(perKmRate || 0),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Trip Cost Estimator"
        subtitle="Calculate exact fuel expenses, distance, and payable amounts"
        backHref="/dashboard"
        icon="calculate"
      />

      <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm space-y-6">
        
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Vehicle Mileage (km/L)</label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Current Petrol Price (₹/L)</label>
            <input
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-emerald-800 text-sm font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">Pricing Model</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold"
          >
            <option value="FUEL_COST">Fuel Cost Only (Actual Fuel Consumed)</option>
            <option value="PER_KM">Per KM Rate Only (Distance × Rate)</option>
            <option value="FUEL_PLUS_PER_KM">Fuel Cost + Per KM Surcharge</option>
          </select>
        </div>

        {/* Breakdown Result Box */}
        <div className="p-5 rounded-xl bg-primary-container text-on-primary-container space-y-3 shadow">
          <div className="flex justify-between items-center text-xs">
            <span>Distance Travelled:</span>
            <span className="font-bold text-white text-sm">{dist} km</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span>Fuel Consumed ({mileage} km/L):</span>
            <span className="font-bold text-white text-sm">{result.estimatedFuelLitres.toFixed(2)} L</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span>Fuel Cost (₹{fuelPrice}/L):</span>
            <span className="font-bold text-white text-sm">{formatCurrency(result.estimatedFuelCostRupees)}</span>
          </div>

          <div className="pt-3 border-t border-on-primary-container/20 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider">Total Estimated Bill</span>
            <span className="font-extrabold text-2xl text-white">{formatCurrency(result.totalAmountRupees)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
