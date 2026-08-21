'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import { VeyloLogo } from '@/components/ui/VeyloLogo';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { HowItWorksInteractive } from '@/components/landing/HowItWorksInteractive';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer } from '@/components/animations/StaggerContainer';
import { StaggerItem } from '@/components/animations/StaggerItem';

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
    <div className="space-y-0">
      {/* ── Hero ── */}
      <section className="pt-8 pb-16 sm:pt-12 sm:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <FadeIn direction="up" duration={0.5}>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">bolt</span>
              Vehicle billing that makes sense
            </div>

            <h1 className="font-bold text-3xl sm:text-4xl lg:text-5xl text-on-background leading-tight tracking-tight">
              Track rides, split costs, get paid — all in one place.
            </h1>

            <p className="text-sm sm:text-base text-on-surface-variant max-w-xl leading-relaxed">
              Fleet owners and riders handle mileage, fuel, and UPI payments without the spreadsheet chaos. Simple, fast, built for how you actually work.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/login"
                className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-elevation-2 text-center flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              <Link
                href="/v/pub_kl16p78_x99a"
                className="bg-surface text-on-surface border border-outline-variant px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-all text-center flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                <span>Try Demo QR</span>
              </Link>
            </div>
          </div>
        </FadeIn>

        {/* Phone Mockup */}
        <FadeIn direction="up" duration={0.6} delay={0.15}>
          <div className="relative w-full max-w-sm mx-auto">
            <div className="bg-surface border border-outline-variant rounded-[2.5rem] shadow-elevation-4 p-4 relative z-10 overflow-hidden">
              <div className="w-1/3 h-5 bg-on-surface/10 rounded-b-xl mx-auto absolute top-0 left-0 right-0" />
              <div className="pt-6 pb-4 px-4 h-[500px] flex flex-col gap-3 overflow-y-auto">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-base text-on-surface">Ride Summary</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">more_horiz</span>
                </div>

                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-on-surface-variant">Vehicle</span>
                    <span className="font-bold text-sm text-on-surface">KL 16 P 78</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-[10px] font-semibold">Petrol</span>
                    <span className="bg-surface-container text-on-surface px-2 py-0.5 rounded text-[10px] font-semibold">40 km/L</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant flex flex-col items-center">
                    <span className="material-symbols-outlined text-primary text-lg mb-0.5">route</span>
                    <span className="font-bold text-sm text-on-surface">{distance} km</span>
                    <span className="text-[10px] text-on-surface-variant">Distance</span>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant flex flex-col items-center">
                    <span className="material-symbols-outlined text-primary text-lg mb-0.5">local_gas_station</span>
                    <span className="font-bold text-sm text-on-surface">₹{fuelPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-on-surface-variant">Fuel Price/L</span>
                  </div>
                </div>

                <div className="mt-auto bg-primary-container p-4 rounded-2xl flex flex-col items-center text-center">
                  <span className="text-[10px] text-on-primary-container mb-1">Total Payable</span>
                  <span className="font-extrabold text-2xl text-on-primary-container mb-3">{formatCurrency(calcResult.totalAmountRupees)}</span>
                  <div className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 opacity-80 cursor-default">
                    <span>Pay Now</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── How It Works ── */}
      <HowItWorksInteractive />

      {/* ── Features ── */}
      <section className="py-16 sm:py-20 border-t border-outline-variant/60" id="features">
        <FadeIn>
          <div className="text-center space-y-2 mb-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary-container/30 px-3 py-1 rounded-full">Features</span>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Everything for Modern Vehicle Operations</h2>
            <p className="text-xs text-on-surface-variant max-w-lg mx-auto">
              From single-vehicle tracking to full-fleet monetization and UPI settlements.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer stagger={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: 'qr_code_scanner', title: 'Instant QR Rider Entry', desc: 'Place QR stickers on your vehicles. Riders scan to start trips instantly with odometer validation and zero setup.' },
              { icon: 'local_gas_station', title: 'Live Fuel Price Engine', desc: 'Auto-fetch official state and city rates for Petrol, Diesel, and CNG to calculate exact trip costs without manual math.' },
              { icon: 'receipt_long', title: 'Automated UPI Billing', desc: 'Generate transparent usage invoices with breakdown of fuel, platform fee, tax, and direct UPI QR pay buttons.' },
            ].map((f, i) => (
              <StaggerItem key={i}>
                <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-elevation-1 space-y-3 hover:shadow-elevation-2 transition-shadow h-full">
                  <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">{f.icon}</span>
                  </div>
                  <h3 className="font-bold text-sm text-on-surface">{f.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </section>

      {/* ── Pricing ── */}
      <section className="py-16 sm:py-20 border-t border-outline-variant/60" id="pricing">
        <FadeIn>
          <div className="text-center space-y-2 mb-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary-container/30 px-3 py-1 rounded-full">Pricing</span>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">Simple, Transparent Plans</h2>
            <p className="text-xs text-on-surface-variant max-w-lg mx-auto">
              Choose the plan that fits your fleet. Upgrade or downgrade anytime.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer stagger={0.12}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {/* Free */}
            <StaggerItem>
              <div className="p-5 rounded-2xl bg-surface border border-outline-variant flex flex-col justify-between space-y-5 h-full">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base text-on-surface">Free</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">Starter</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-on-surface">₹0</span>
                    <span className="text-[11px] text-on-surface-variant">/ month</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Perfect for individual vehicle owners.</p>
                  <ul className="space-y-1.5 text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant">
                    {['1 Registered Vehicle', 'Basic ODO & Fuel Cost Calc', 'QR Code Entry'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">check</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/login" className="w-full py-2.5 text-center rounded-xl border border-outline-variant font-bold text-[11px] text-primary hover:bg-surface-container-low transition-all">
                  Get Started Free
                </Link>
              </div>
            </StaggerItem>

            {/* Pro */}
            <StaggerItem>
              <div className="p-5 rounded-2xl bg-primary text-on-primary border-2 border-primary shadow-elevation-3 flex flex-col justify-between space-y-5 relative overflow-hidden h-full">
                <div className="absolute top-3 right-3 bg-secondary-container text-on-secondary-container text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Popular
                </div>
                <div className="space-y-3">
                  <span className="font-bold text-base">Pro</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">₹499</span>
                    <span className="text-[11px] opacity-70">/ month</span>
                  </div>
                  <p className="text-[11px] opacity-75">Ideal for small fleet owners up to 5 vehicles.</p>
                  <ul className="space-y-1.5 text-[11px] opacity-85 pt-2 border-t border-white/20">
                    {['Up to 5 Vehicles', 'Real-time Live Fuel Rates', 'Automated Usage Invoices', 'Instant UPI QR Payment Link'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-white/90">check</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/settings/billing" className="w-full py-2.5 text-center rounded-xl bg-on-primary text-primary font-bold text-[11px] uppercase hover:bg-surface-bright transition-all">
                  Upgrade to Pro
                </Link>
              </div>
            </StaggerItem>

            {/* Business */}
            <StaggerItem>
              <div className="p-5 rounded-2xl bg-surface border border-outline-variant flex flex-col justify-between space-y-5 h-full">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base text-on-surface">Business</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container">Fleet Scale</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-on-surface">₹1,499</span>
                    <span className="text-[11px] text-on-surface-variant">/ month</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Full suite for commercial fleet operators.</p>
                  <ul className="space-y-1.5 text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant">
                    {['Unlimited Vehicles', 'Priority Maintenance Engine', 'Monetization & Revenue Analytics', 'Dedicated Support & Custom Export'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-primary">check</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/settings/billing" className="w-full py-2.5 text-center rounded-xl border border-outline-variant font-bold text-[11px] text-primary hover:bg-surface-container-low transition-all">
                  Contact Fleet Sales
                </Link>
              </div>
            </StaggerItem>
          </div>
        </StaggerContainer>
      </section>

      {/* ── Ad ── */}
      <AdSlot placement="public-page-bottom" />

      {/* ── Footer ── */}
      <footer className="mt-16 border-t border-outline-variant pt-8 pb-12 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <VeyloLogo className="w-5 h-5" />
          <span className="text-xs font-bold text-on-surface">Veylo</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-[11px] text-on-surface-variant">
          <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
          <Link href="/scan" className="hover:text-primary transition-colors">QR Scan</Link>
          <Link href="/settings/billing" className="hover:text-primary transition-colors">Pricing</Link>
        </div>
        <p className="text-[10px] text-on-surface-variant/50">&copy; {new Date().getFullYear()} Veylo. Built in India.</p>
      </footer>
    </div>
  );
}
