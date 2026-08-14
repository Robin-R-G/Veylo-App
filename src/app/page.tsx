'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';

export default function LandingPage() {
  const [distance, setDistance] = useState<number>(8);
  const [mileage, setMileage] = useState<number>(40);
  const [fuelPrice, setFuelPrice] = useState<number>(104.20);

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
            Veylo — Move. Track. Pay.
          </div>

          <h1 className="font-bold text-3xl sm:text-5xl text-on-background leading-tight tracking-tight">
            Track every ride. Calculate every cost. Pay effortlessly.
          </h1>
          
          <p className="text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
            Manage your vehicles, mileage, fuel costs, usage bills and UPI payments from one simple platform designed for professional fleet and personal vehicle management.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              href="/dashboard"
              className="bg-primary text-on-primary px-6 py-3.5 rounded-lg font-semibold text-sm uppercase tracking-wider hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm text-center flex items-center justify-center gap-2"
            >
              <span>GET STARTED</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            <Link
              href="/v/pub_kl16p78_x99a"
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
                <Link
                  href="/v/pub_kl16p78_x99a"
                  className="w-full bg-primary text-on-primary py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90"
                >
                  <span>PAY NOW</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section (5-Step Horizontal Grid) */}
      <section className="py-12 bg-surface rounded-2xl p-6 border border-outline-variant shadow-sm" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">How It Works in 5 Steps</h2>
            <p className="text-sm text-on-surface-variant max-w-2xl mx-auto">A seamless workflow designed to eliminate administrative overhead.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 relative">
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-outline-variant shadow-sm flex items-center justify-center mb-3 text-primary">
                <span className="material-symbols-outlined text-2xl">app_registration</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface mb-1">1. Register</h3>
              <p className="text-xs text-on-surface-variant">Add your vehicles.</p>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-outline-variant shadow-sm flex items-center justify-center mb-3 text-primary">
                <span className="material-symbols-outlined text-2xl">play_circle</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface mb-1">2. Start</h3>
              <p className="text-xs text-on-surface-variant">Log ODO reading.</p>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-outline-variant shadow-sm flex items-center justify-center mb-3 text-primary">
                <span className="material-symbols-outlined text-2xl">moving</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface mb-1">3. Track</h3>
              <p className="text-xs text-on-surface-variant">Monitor journey.</p>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-outline-variant shadow-sm flex items-center justify-center mb-3 text-primary">
                <span className="material-symbols-outlined text-2xl">calculate</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface mb-1">4. Calculate</h3>
              <p className="text-xs text-on-surface-variant">Auto fuel costs.</p>
            </div>

            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-surface-container-low rounded-full border border-outline-variant shadow-sm flex items-center justify-center mb-3 text-primary">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface mb-1">5. Pay</h3>
              <p className="text-xs text-on-surface-variant">Settle via UPI.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Slot */}
      <AdSlot placement="public-page-bottom" />
    </div>
  );
}
