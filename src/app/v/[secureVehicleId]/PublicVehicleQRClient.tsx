'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, IssueType, IssueSeverity, PricingMode, FuelPrice } from '@/types';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { getVehicleById } from '@/lib/services/supabase/data';
import { AdSlot } from '@/components/ads/AdSlot';

function getSupabase() {
  return createClient();
}

export default function PublicVehicleQRClient({ secureVehicleId }: { secureVehicleId: string }) {
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fuelPrice, setFuelPrice] = useState<FuelPrice | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('Rahul Nair');
  const [customerPhone, setCustomerPhone] = useState('+91 94000 11223');
  const [endOdometer, setEndOdometer] = useState<string>('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('FUEL_COST');
  const [perKmRate, setPerKmRate] = useState<number>(3);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);

  // Issue reporting modal state
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>('OTHER');
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity>('MEDIUM');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueReportedSuccess, setIssueReportedSuccess] = useState(false);

  const [mounted, setMounted] = useState(false);

  const loadLatestPrice = async (fuelType: any, stateName = 'Kerala', cityName = 'Kozhikode') => {
    setIsRefreshingPrice(true);
    try {
      const fp = await fuelPriceService.getLatestFuelPrice(fuelType, stateName, cityName);
      setFuelPrice(fp);
    } finally {
      setIsRefreshingPrice(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    getVehicleById(secureVehicleId)
      .then((data) => {
        if (!data) return;
        setVehicle(data);
        setEndOdometer(String(data.currentOdometer === 12500 ? 12508 : data.currentOdometer + 8));
        loadLatestPrice(data.fuelType, data.state || 'Kerala', data.city || 'Kozhikode');
      })
      .catch(() => {});
  }, [secureVehicleId]);

  if (!mounted || !vehicle) {
    return (
      <div className="bg-surface p-8 rounded-xl border border-outline-variant text-center text-on-surface-variant text-xs">
        Vehicle record not found or QR link invalid.
      </div>
    );
  }

  const endOdoNum = Number(endOdometer || 0);
  const startOdoNum = vehicle.currentOdometer;
  const distanceKm = endOdoNum >= startOdoNum ? endOdoNum - startOdoNum : 0;
  const priceRupees = fuelPrice?.priceRupees || 0;
  const unit = vehicle.fuelType === 'CNG' ? 'kg' : 'L';

  // Calculation preview
  let calcPreview = null;
  if (distanceKm > 0) {
    calcPreview = calculateRideCosts({
      startOdometer: startOdoNum,
      endOdometer: endOdoNum,
      mileageKmpl: vehicle.mileageKmpl,
      fuelPricePaise: Math.round(priceRupees * 100),
      pricingMode,
      perKmRateRupees: perKmRate,
    });
  }

  const handleCalculateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Please enter rider name.');
      return;
    }

    if (endOdoNum < startOdoNum) {
      setErrorMsg(`End odometer (${endOdoNum} km) cannot be less than start odometer (${startOdoNum} km).`);
      return;
    }

    try {
      const supabase = getSupabase();
      const { data: tripData, error: tripErr } = await supabase
        .from('trips')
        .insert({
          vehicle_id: vehicle.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          start_odometer: startOdoNum,
          end_odometer: endOdoNum,
          fuel_price_rupees: priceRupees,
          pricing_mode: pricingMode,
          per_km_rate_rupees: perKmRate,
        })
        .select()
        .single();

      if (tripErr) throw tripErr;

      const res = await fetch('/api/billing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: tripData.id }),
      });

      if (!res.ok) throw new Error('Failed to generate bill');
      const { invoiceId } = await res.json();

      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating usage bill.');
    }
  };

  const handleReportIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDesc.trim()) return;

    const supabase = getSupabase();
    await supabase.from('issues').insert({
      vehicle_id: vehicle.id,
      reporter_name: customerName || 'Public Rider',
      issue_type: issueType,
      severity: issueSeverity,
      description: issueDesc,
    });

    setIssueReportedSuccess(true);
    setShowReportIssue(false);
    setIssueDesc('');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Contextual Header */}
      <div className="text-center w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mb-2 shadow-sm">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
        </div>
        <h1 className="font-bold text-2xl text-on-background">Vehicle Found</h1>
        <p className="text-sm text-on-surface-variant mt-1">Ready to start your ride entry with Veylo.</p>
      </div>

      {/* Vehicle Detail Card */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden space-y-4">
        <div className="h-28 bg-surface-container-high relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
          <span className="material-symbols-outlined text-5xl text-primary z-10">two_wheeler</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-extrabold text-2xl text-on-surface tracking-wider font-mono">{vehicle.registrationNumber}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold">
                  {vehicle.vehicleType}
                </span>
                <span className="px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold">
                  {vehicle.fuelType}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="font-bold text-xl text-primary">{vehicle.mileageKmpl}</span>
              <span className="text-xs text-on-surface-variant block">km/L</span>
            </div>
          </div>

          <hr className="border-outline-variant" />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant">
              <div className="flex items-center gap-1 text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-sm">speed</span>
                <span className="font-semibold text-[10px] uppercase">Start Odometer</span>
              </div>
              <span className="font-bold text-base text-on-surface">{startOdoNum.toLocaleString()} km</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant">
              <div className="flex items-center gap-1 text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-sm">local_gas_station</span>
                <span className="font-semibold text-[10px] uppercase">{vehicle.fuelType} Rate</span>
              </div>
              {priceRupees > 0 ? (
                <>
                  <span className="font-bold text-base text-emerald-800">₹{priceRupees.toFixed(2)}/{unit}</span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">{vehicle.city || 'Kozhikode'}, {vehicle.state || 'Kerala'}</span>
                </>
              ) : (
                <span className="font-semibold text-xs text-error block">Fuel price temporarily unavailable</span>
              )}
            </div>

          </div>
        </div>
      </div>

      {issueReportedSuccess && (
        <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Issue report logged successfully for vehicle owner.
        </div>
      )}

      {/* Main Form: Enter End Odometer */}
      <form onSubmit={handleCalculateAndSubmit} className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm space-y-4">
        <div className="border-b border-outline-variant pb-2">
          <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">calculate</span>
            End Ride & Calculate Bill
          </h3>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">Rider Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-sm font-semibold focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-on-surface">End Odometer Reading (KM)</label>
            <span className="text-[11px] text-on-surface-variant">Start: {startOdoNum} km</span>
          </div>
          <input
            type="number"
            value={endOdometer}
            onChange={(e) => setEndOdometer(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant text-xl font-extrabold text-primary focus:outline-none focus:border-primary"
            required
          />
        </div>

        {/* Real-time Calculation Summary Box */}
        {calcPreview && (
          <div className="p-4 rounded-xl bg-primary-container text-on-primary-container space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span>Distance Travelled:</span>
              <span className="font-bold text-white text-sm">{calcPreview.distanceKm} km</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Fuel Consumed ({vehicle.mileageKmpl} km/L):</span>
              <span className="font-bold text-white text-sm">{calcPreview.estimatedFuelLitres.toFixed(2)} L</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span>Fuel Price Rate ({vehicle.city || 'Kozhikode'}):</span>
              <span className="font-bold text-white text-sm">
                {priceRupees > 0 ? `₹${priceRupees.toFixed(2)} / ${unit}` : 'Fuel price temporarily unavailable'}
              </span>
            </div>

            <div className="pt-2 border-t border-on-primary-container/20 flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-primary-container">Total Payable</span>
              <span className="font-extrabold text-2xl text-white">{formatCurrency(calcPreview.totalAmountRupees)}</span>
            </div>

            <button
              type="submit"
              className="w-full mt-3 bg-primary text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow hover:bg-primary/90"
            >
              <span>PAY {formatCurrency(calcPreview.totalAmountRupees)}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        )}

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setShowReportIssue(!showReportIssue)}
            className="text-xs text-error font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            <span className="material-symbols-outlined text-sm">report_problem</span>
            Report Vehicle Maintenance Issue
          </button>
        </div>
      </form>

      {/* Report Issue Form */}
      {showReportIssue && (
        <form onSubmit={handleReportIssueSubmit} className="p-4 rounded-xl bg-error-container text-on-error-container space-y-3 text-xs">
          <h4 className="font-bold text-xs uppercase">Report Vehicle Maintenance Issue</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1">Issue Category</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueType)}
                className="w-full px-2 py-1.5 rounded bg-surface text-on-surface border border-outline-variant text-xs"
              >
                <option value="BRAKE">Brake</option>
                <option value="TYRE">Tyre</option>
                <option value="ENGINE">Engine</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="DAMAGE">Damage</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">Severity</label>
              <select
                value={issueSeverity}
                onChange={(e) => setIssueSeverity(e.target.value as IssueSeverity)}
                className="w-full px-2 py-1.5 rounded bg-surface text-on-surface border border-outline-variant text-xs"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              rows={2}
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
              placeholder="Describe issue..."
              className="w-full px-2 py-1.5 rounded bg-surface text-on-surface border border-outline-variant text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowReportIssue(false)} className="px-3 py-1 bg-surface rounded text-xs text-on-surface">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-error text-on-error rounded text-xs font-semibold">Submit</button>
          </div>
        </form>
      )}

      <AdSlot placement="public-page-bottom" />
    </div>
  );
}
