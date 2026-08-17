'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { useEffect } from 'react';


import { HowItWorksInteractive } from '@/components/landing/HowItWorksInteractive';

export default function LandingPage() {
  const [distance, setDistance] = useState<number>(8);
  const [mileage, setMileage] = useState<number>(40);
  const [fuelPrice, setFuelPrice] = useState<number>(0);

  useEffect(() => {
    fuelPriceService.getCachedPrice('PETROL', 'Kerala', 'Kozhikode').then(rate => {
      setFuelPrice(rate || 104.20);
    });
  }, []);

  const calcResult = calculateRideCosts({
    startOdometer: 12500,
    endOdometer: 12500 + Number(distance || 0),
    mileageKmpl: Number(mileage || 1),
    fuelPricePaise: Math.round(Number(fuelPrice || 0) * 100),
  });

  return (
    <div className="space-y-12">
      
      {/* Hero Section */}
      <section className="pt-6 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">bolt</span>
            Vehicle billing that makes sense
          </div>

          <h1 className="font-bold text-3xl sm:text-5xl text-on-background leading-tight tracking-tight">
            Track rides, split costs, get paid — all in one place.
          </h1>
          
          <p className="text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
            Fleet owners and riders handle mileage, fuel, and UPI payments without the spreadsheet chaos. Simple, fast, built for how you actually work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              href="/login"
              className="bg-primary text-on-primary px-6 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm text-center flex items-center justify-center gap-2"
            >
              <span>GET STARTED</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            <Link
              href="/scan"
              className="bg-surface text-secondary border border-outline-variant px-6 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-surface-container-low transition-all text-center flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              <span>TRY QR ENTRY</span>
            </Link>
          </div>
        </div>

        {/* Hero Visual: Glassmorphic Phone Mockup */}
        <div className="relative w-full max-w-md mx-auto">
          <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-3xl transform -rotate-6"></div>
          <div className="bg-surface border border-outline-variant rounded-[2.5rem] shadow-xl p-4 relative z-10 overflow-hidden">
            {/* Phone Notch */}
            <div className="w-1/3 h-5 bg-on-background rounded-b-xl mx-auto absolute top-0 left-0 right-0"></div>
            <div className="pt-6 pb-4 px-4 h-[540px] flex flex-col gap-4 overflow-y-auto">
              
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-lg text-on-surface">Ride Summary</span>
                <span className="material-symbols-outlined text-outline">more_horiz</span>
              </div>

              {/* Vehicle Badge Card */}
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-on-surface-variant">Vehicle</span>
                  <span className="font-bold text-base text-on-surface">KL 16 P 78</span>
                </div>
                <div className="flex gap-2">
                  <span className="bg-primary-container text-on-primary-container px-2.5 py-0.5 rounded text-xs font-semibold">Petrol</span>
                  <span className="bg-surface-container text-on-surface px-2.5 py-0.5 rounded text-xs font-semibold">40 km/L</span>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined text-primary mb-1">route</span>
                  <span className="font-bold text-lg text-on-surface">{distance} km</span>
                  <span className="text-[11px] text-on-surface-variant">Distance</span>
                </div>

                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center items-center">
                  <span className="material-symbols-outlined text-primary mb-1">local_gas_station</span>
                  <span className="font-bold text-base text-on-surface">₹{fuelPrice.toFixed(2)}</span>
                  <span className="text-[11px] text-on-surface-variant">Petrol Price/L</span>
                </div>
              </div>

              {/* Total Cost Pay Card */}
              <div className="mt-auto bg-primary-container p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-xs text-on-primary-container mb-1">Total Payable Cost</span>
                <span className="font-extrabold text-3xl text-on-primary-container mb-4">{formatCurrency(calcResult.totalAmountRupees)}</span>
                <div
                  className="w-full bg-primary text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm opacity-80 cursor-default"
                >
                  <span>PAY NOW</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section: Dynamic Multi-Screen Interactive Mockup */}
      <HowItWorksInteractive />

      {/* Features Section */}
      <section className="py-16 sm:py-20 space-y-10 border-t border-outline-variant/60" id="features">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-container/30 px-3 py-1 rounded-full">Features</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Everything Needed for Modern Vehicle Operations</h2>
          <p className="text-sm text-on-surface-variant max-w-2xl mx-auto">
            From single-vehicle tracking to full-fleet monetization and UPI settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined">qr_code_scanner</span>
            </div>
            <h3 className="font-bold text-base text-on-surface">Instant QR Rider Entry</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Place QR stickers on your vehicles. Riders scan to start trips instantly with odometer validation and zero setup.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined">local_gas_station</span>
            </div>
            <h3 className="font-bold text-base text-on-surface">Live Fuel Price Engine</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Auto-fetch official state and city rates for Petrol, Diesel, and CNG to calculate exact trip costs without manual math.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <h3 className="font-bold text-base text-on-surface">Automated UPI Billing</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Generate transparent usage invoices with breakdown of fuel, platform fee, tax, and direct UPI QR pay buttons.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-20 space-y-10 border-t border-outline-variant/60" id="pricing">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-container/30 px-3 py-1 rounded-full">Pricing</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Simple, Transparent Subscription Plans</h2>
          <p className="text-sm text-on-surface-variant max-w-2xl mx-auto">
            Choose the plan that fits your vehicle fleet size. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Free Tier */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-on-surface">Free</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-surface-container text-on-surface">Starter</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-on-surface">₹0</span>
                <span className="text-xs text-on-surface-variant">/ month</span>
              </div>
              <p className="text-xs text-on-surface-variant">Perfect for individual vehicle owners trying out Veylo.</p>
              <ul className="space-y-2 text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> 1 Registered Vehicle</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> Basic ODO & Fuel Cost Calc</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> QR Code Entry</li>
              </ul>
            </div>
            <Link href="/login" className="w-full py-3 text-center rounded-xl border border-outline-variant font-bold text-xs text-primary hover:bg-surface-container transition-all">
              GET STARTED FREE
            </Link>
          </div>

          {/* Pro Tier (Popular) */}
          <div className="p-6 rounded-2xl bg-primary text-on-primary border-2 border-primary shadow-lg flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              POPULAR
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Pro</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">₹499</span>
                <span className="text-xs opacity-80">/ month</span>
              </div>
              <p className="text-xs opacity-80">Ideal for small fleet owners managing up to 5 vehicles.</p>
              <ul className="space-y-2 text-xs opacity-90 pt-2 border-t border-white/20">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-300">check</span> Up to 5 Vehicles</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-300">check</span> Real-time Live Fuel Rates</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-300">check</span> Automated Usage Invoices</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-300">check</span> Instant UPI QR Payment Link</li>
              </ul>
            </div>
            <Link href="/settings/billing" className="w-full py-3 text-center rounded-xl bg-on-primary text-primary font-bold text-xs uppercase hover:bg-surface-bright transition-all shadow">
              UPGRADE TO PRO
            </Link>
          </div>

          {/* Business Tier */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-on-surface">Business</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-tertiary-container text-on-tertiary-container">Fleet Scale</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-on-surface">₹1,499</span>
                <span className="text-xs text-on-surface-variant">/ month</span>
              </div>
              <p className="text-xs text-on-surface-variant">Full suite for commercial fleet operators & rental companies.</p>
              <ul className="space-y-2 text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> Unlimited Vehicles</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> Priority Maintenance Engine</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> Monetization & Revenue Analytics</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-emerald-600">check</span> Dedicated Support & Custom Export</li>
              </ul>
            </div>
            <Link href="/settings/billing" className="w-full py-3 text-center rounded-xl border border-outline-variant font-bold text-xs text-primary hover:bg-surface-container transition-all">
              CONTACT FLEET SALES
            </Link>
          </div>
        </div>
      </section>

      {/* Ad Slot */}
      <AdSlot placement="public-page-bottom" />
    </div>
  );
}
