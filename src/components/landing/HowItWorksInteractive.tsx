'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export type ScreenStep = 'DISCOVER' | 'DETAILS' | 'SCAN' | 'RIDE' | 'COMPLETE' | 'PAYMENT';

interface StepMeta {
  key: ScreenStep;
  screenIndex: number;
  stepGroupIndex: number; // 0 to 3 for the 4 left-hand explanatory cards
  title: string;
  subtitle: string;
  durationMs: number;
  floatingChip: {
    icon: string;
    text: string;
    badge: string;
  };
}

const STEPS: StepMeta[] = [
  {
    key: 'DISCOVER',
    screenIndex: 0,
    stepGroupIndex: 0,
    title: 'Discover Nearby Fleet',
    subtitle: 'Locate verified vehicles available around you on live map with real-time fuel and pricing.',
    durationMs: 3200,
    floatingChip: {
      icon: 'near_me',
      text: '12 vehicles nearby',
      badge: 'Available',
    },
  },
  {
    key: 'DETAILS',
    screenIndex: 1,
    stepGroupIndex: 0,
    title: 'Inspect Vehicle Specs',
    subtitle: 'Transparent vehicle mileage, official fuel benchmark rates, and fixed daily/hourly rates.',
    durationMs: 3000,
    floatingChip: {
      icon: 'verified',
      text: 'Honda Activa 6G',
      badge: '₹399/day',
    },
  },
  {
    key: 'SCAN',
    screenIndex: 2,
    stepGroupIndex: 1,
    title: 'Scan QR & Unlock',
    subtitle: 'Point phone at the vehicle QR sticker. Immediate odometer logging with zero paper forms.',
    durationMs: 3200,
    floatingChip: {
      icon: 'qr_code_scanner',
      text: 'QR Verified: KL 16 P 78',
      badge: 'Instant',
    },
  },
  {
    key: 'RIDE',
    screenIndex: 3,
    stepGroupIndex: 2,
    title: 'Live GPS & Ride Telemetry',
    subtitle: 'Track live distance, trip duration, speed, and automatic fuel cost calculation in real time.',
    durationMs: 4200,
    floatingChip: {
      icon: 'navigation',
      text: 'Live GPS Tracking',
      badge: '38 km/h',
    },
  },
  {
    key: 'COMPLETE',
    screenIndex: 4,
    stepGroupIndex: 3,
    title: 'Ride Completed',
    subtitle: 'Instant breakdown calculation combining base rental, fuel consumption, and exact distance.',
    durationMs: 3200,
    floatingChip: {
      icon: 'check_circle',
      text: '18.4 km Completed',
      badge: '₹526 Total',
    },
  },
  {
    key: 'PAYMENT',
    screenIndex: 5,
    stepGroupIndex: 3,
    title: 'Instant UPI Settlement',
    subtitle: 'Direct peer-to-peer UPI transfer with zero commission and instant digital GST invoice receipt.',
    durationMs: 3400,
    floatingChip: {
      icon: 'payments',
      text: 'UPI Paid Successfully',
      badge: 'Direct Pay',
    },
  },
];

const STEP_GROUPS = [
  {
    groupIndex: 0,
    number: '01',
    title: 'Find & Select Vehicle',
    description: 'Browse verified nearby vehicles with live availability, transparent rates, and official fuel benchmarks.',
    icon: 'travel_explore',
    screens: [0, 1],
  },
  {
    groupIndex: 1,
    number: '02',
    title: 'Scan QR & Unlock',
    description: 'Scan the vehicle sticker QR code. The app captures start odometer and unlocks your ride instantly.',
    icon: 'qr_code_scanner',
    screens: [2],
  },
  {
    groupIndex: 2,
    number: '03',
    title: 'Ride & Live Telemetry',
    description: 'Monitor live distance, GPS route tracking, and automated fuel calculations calculated in real time.',
    icon: 'route',
    screens: [3],
  },
  {
    groupIndex: 3,
    number: '04',
    title: 'Finish & Instant UPI Pay',
    description: 'Complete the trip with one tap. Automatic itemized digital invoice with direct owner UPI settlement.',
    icon: 'receipt_long',
    screens: [4, 5],
  },
];

export function HowItWorksInteractive() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Active ride live counters
  const [rideDistance, setRideDistance] = useState<number>(12.4);
  const [rideCost, setRideCost] = useState<number>(184.20);
  const [rideSeconds, setRideSeconds] = useState<number>(1476); // 24m 36s

  const currentStep = STEPS[activeStepIndex];
  const activeGroupIndex = currentStep.stepGroupIndex;

  // Auto-progress timer
  useEffect(() => {
    if (!isPlaying) return;

    const duration = currentStep.durationMs;
    const intervalTime = 50;
    const stepIncrement = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev + stepIncrement >= 100) {
          setActiveStepIndex((current) => (current + 1) % STEPS.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, activeStepIndex, currentStep.durationMs]);

  // Subtle animated counter for Active Ride (Step 3)
  useEffect(() => {
    if (activeStepIndex === 3) {
      const liveInterval = setInterval(() => {
        setRideDistance((d) => Number((d + 0.05).toFixed(2)));
        setRideCost((c) => Number((c + 0.45).toFixed(2)));
        setRideSeconds((s) => s + 1);
      }, 900);
      return () => clearInterval(liveInterval);
    } else {
      setRideDistance(12.4);
      setRideCost(184.20);
      setRideSeconds(1476);
    }
  }, [activeStepIndex]);

  const handleSelectGroup = (groupIndex: number) => {
    const targetScreen = STEP_GROUPS[groupIndex].screens[0];
    setActiveStepIndex(targetScreen);
    setProgressPercent(0);
  };

  const handleSelectScreen = (idx: number) => {
    setActiveStepIndex(idx);
    setProgressPercent(0);
  };

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <section className="py-12 bg-surface rounded-3xl p-6 sm:p-10 border border-outline-variant shadow-sm relative overflow-hidden" id="how-it-works">
      
      {/* Background ambient lighting */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary-container/5 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">sync</span>
            Interactive Platform Flow
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            How Veylo Works
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            From smart vehicle discovery and instant QR unlock to live GPS telemetry and direct UPI settlements — experience the complete journey.
          </p>
        </div>

        {/* Interactive Layout: Left Steps + Right Phone Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Synchronized Workflow Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-3">
              {STEP_GROUPS.map((group) => {
                const isActive = group.groupIndex === activeGroupIndex;
                const isCurrentScreenInGroup = group.screens.includes(activeStepIndex);

                return (
                  <button
                    key={group.groupIndex}
                    type="button"
                    onClick={() => handleSelectGroup(group.groupIndex)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                      isActive
                        ? 'bg-surface-container-low border-primary shadow-md ring-1 ring-primary/20'
                        : 'bg-surface border-outline-variant/60 hover:bg-surface-container-lowest hover:border-outline-variant'
                    }`}
                  >
                    {/* Top Progress bar for active group */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-surface-container">
                        <div
                          className="h-full bg-primary transition-all duration-100 ease-linear"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Step Number & Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-all ${
                          isActive
                            ? 'bg-primary text-on-primary shadow-sm scale-105'
                            : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{group.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              STEP {group.number}
                            </span>
                            <h3 className={`font-bold text-base transition-colors ${
                              isActive ? 'text-on-surface' : 'text-on-surface/80 group-hover:text-on-surface'
                            }`}>
                              {group.title}
                            </h3>
                          </div>

                          {isActive && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>

                        <p className={`text-xs leading-relaxed transition-colors ${
                          isActive ? 'text-on-surface-variant' : 'text-on-surface-variant/70'
                        }`}>
                          {group.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Playback & Screen Indicator Controls */}
            <div className="flex items-center justify-between pt-2 px-2">
              {/* Screen Dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((step, idx) => (
                  <button
                    key={step.key}
                    onClick={() => handleSelectScreen(idx)}
                    title={step.title}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeStepIndex === idx
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-outline-variant hover:bg-outline'
                    }`}
                  ></button>
                ))}
              </div>

              {/* Pause/Play and Nav Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectScreen((activeStepIndex - 1 + STEPS.length) % STEPS.length)}
                  className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs flex items-center justify-center transition-all"
                  title="Previous Screen"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                    isPlaying
                      ? 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                      : 'border-primary bg-primary text-on-primary shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  <span>{isPlaying ? 'Auto Playing' : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScreen((activeStepIndex + 1) % STEPS.length)}
                  className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs flex items-center justify-center transition-all"
                  title="Next Screen"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Premium High-Fidelity Mobile Mockup */}
          <div className="lg:col-span-5 flex justify-center relative">
            
            {/* Floating Live Badge Chip */}
            <div className="absolute -top-4 right-2 sm:right-6 z-30 animate-float-badge">
              <div className="bg-surface/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-outline-variant shadow-lg flex items-center gap-2.5 text-xs font-bold text-on-surface">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">{currentStep.floatingChip.icon}</span>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-on-surface">{currentStep.floatingChip.text}</p>
                  <span className="text-[9px] font-mono text-emerald-700 font-semibold">{currentStep.floatingChip.badge}</span>
                </div>
              </div>
            </div>

            {/* Realistic Smartphone Hardware Shell */}
            <div className="w-full max-w-[320px] sm:max-w-[340px] bg-[#111618] p-3 rounded-[3rem] shadow-2xl border-4 border-[#2c3338] relative overflow-hidden transition-all duration-300">
              
              {/* Inner Bezel / Screen Container */}
              <div className="bg-background rounded-[2.3rem] overflow-hidden flex flex-col h-[580px] border border-black/20 relative shadow-inner">
                
                {/* Status Bar */}
                <div className="pt-3 px-5 flex items-center justify-between text-[11px] font-bold text-on-surface/80 select-none shrink-0 bg-surface/80 backdrop-blur-sm z-20">
                  <span>9:41</span>
                  {/* Dynamic Island Speaker Notch */}
                  <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">signal_cellular_4_bar</span>
                    <span className="material-symbols-outlined text-xs">wifi</span>
                    <span className="material-symbols-outlined text-xs">battery_full</span>
                  </div>
                </div>

                {/* Animated Screen Content Viewport */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                  
                  {/* ========================================================================= */}
                  {/* SCREEN 01: Discover Vehicle */}
                  {/* ========================================================================= */}
                  {activeStepIndex === 0 && (
                    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Nearby Vehicles</p>
                          <h4 className="font-extrabold text-sm text-on-surface">Kozhikode Beach, KL</h4>
                        </div>
                        <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">search</span>
                        </span>
                      </div>

                      {/* Map Viewport Graphic */}
                      <div className="h-44 rounded-2xl bg-slate-100 border border-outline-variant/60 relative overflow-hidden shadow-inner flex items-center justify-center">
                        {/* Map Grid Roads */}
                        <svg className="absolute inset-0 w-full h-full stroke-slate-300 stroke-2" fill="none">
                          <path d="M-20 40 Q 80 90, 180 50 T 360 80" strokeDasharray="4 4" />
                          <path d="M40 -10 L 90 200" stroke="#cbd5e1" strokeWidth="4" />
                          <path d="M120 20 Q 220 80, 260 190" stroke="#cbd5e1" strokeWidth="3" />
                          <path d="M0 130 L 320 110" stroke="#e2e8f0" strokeWidth="5" />
                        </svg>

                        {/* Location Pin with Radar Wave */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary/20 animate-radar-pulse absolute"></div>
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg z-10">
                            <span className="material-symbols-outlined text-xs">my_location</span>
                          </div>
                        </div>

                        {/* Vehicle Pins */}
                        <div className="absolute top-8 right-12 bg-white px-1.5 py-0.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1 text-[10px] font-bold text-on-surface">
                          <span>🛵</span>
                          <span>2.4 km</span>
                        </div>

                        <div className="absolute bottom-6 left-8 bg-white px-1.5 py-0.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1 text-[10px] font-bold text-on-surface">
                          <span>🚗</span>
                          <span>3.1 km</span>
                        </div>
                      </div>

                      {/* Featured Vehicle Card */}
                      <div className="bg-surface p-3.5 rounded-2xl border border-outline-variant shadow-sm space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-on-surface">Honda Activa 6G</span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">Available</span>
                            </div>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">⭐ 4.9 (128 rides) • 2.4 km away</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-primary">₹399</p>
                            <span className="text-[9px] text-on-surface-variant">/ day</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-semibold bg-surface-container px-2 py-0.5 rounded-md text-on-surface">45 km/L</span>
                          <span className="text-[10px] font-semibold bg-surface-container px-2 py-0.5 rounded-md text-on-surface">Petrol</span>
                          <span className="text-[10px] font-semibold bg-surface-container px-2 py-0.5 rounded-md text-on-surface">Automatic</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectScreen(1)}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
                      >
                        <span>View Details</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* SCREEN 02: Vehicle Details */}
                  {/* ========================================================================= */}
                  {activeStepIndex === 1 && (
                    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <button onClick={() => handleSelectScreen(0)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-sm">arrow_back</span>
                        </button>
                        <span className="text-xs font-bold text-on-surface">Vehicle Details</span>
                        <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-sm">share</span>
                        </span>
                      </div>

                      {/* Hero Image Showcase Badge */}
                      <div className="h-32 rounded-2xl bg-gradient-to-br from-primary/10 to-primary-container/20 border border-outline-variant/60 flex flex-col items-center justify-center p-3 relative">
                        <span className="material-symbols-outlined text-5xl text-primary">moped</span>
                        <div className="absolute bottom-2 left-3 bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-on-surface shadow-sm">
                          KL 16 P 78
                        </div>
                      </div>

                      {/* Vehicle Specs Grid */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-surface p-2 rounded-xl border border-outline-variant/60">
                          <p className="text-[9px] text-on-surface-variant font-bold uppercase">Engine / Power</p>
                          <p className="text-xs font-extrabold text-on-surface">110 cc EFI</p>
                        </div>
                        <div className="bg-surface p-2 rounded-xl border border-outline-variant/60">
                          <p className="text-[9px] text-on-surface-variant font-bold uppercase">Fuel Efficiency</p>
                          <p className="text-xs font-extrabold text-primary">45 km/L</p>
                        </div>
                        <div className="bg-surface p-2 rounded-xl border border-outline-variant/60">
                          <p className="text-[9px] text-on-surface-variant font-bold uppercase">Live Petrol Rate</p>
                          <p className="text-xs font-extrabold text-emerald-700">₹104.20/L</p>
                        </div>
                        <div className="bg-surface p-2 rounded-xl border border-outline-variant/60">
                          <p className="text-[9px] text-on-surface-variant font-bold uppercase">Location</p>
                          <p className="text-xs font-extrabold text-on-surface">Beach Road</p>
                        </div>
                      </div>

                      {/* Pricing Model Banner */}
                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-on-surface-variant font-semibold">Standard Rental Rate</p>
                          <p className="text-sm font-black text-on-surface">₹399 <span className="text-[10px] font-normal text-on-surface-variant">/ 24 hrs</span></p>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
                          Verified Owner
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectScreen(2)}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                        <span>Rent with QR Code</span>
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* SCREEN 03: Scan QR / Unlock */}
                  {/* ========================================================================= */}
                  {activeStepIndex === 2 && (
                    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <button onClick={() => handleSelectScreen(1)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-sm">arrow_back</span>
                        </button>
                        <span className="text-xs font-bold text-on-surface">Scan Vehicle QR</span>
                        <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-sm">flash_on</span>
                        </span>
                      </div>

                      {/* Viewfinder Scanner Area */}
                      <div className="flex-1 min-h-[220px] rounded-2xl bg-neutral-900 border-2 border-neutral-800 relative flex flex-col items-center justify-center p-4 overflow-hidden">
                        
                        {/* 4 Viewfinder Target Corners */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"></div>

                        {/* Scanner Laser Sweep Line */}
                        <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-laser-sweep z-20"></div>

                        {/* QR Graphic Silhouette */}
                        <div className="w-28 h-28 bg-white p-2.5 rounded-xl shadow-lg flex flex-col items-center justify-center relative">
                          <div className="w-full h-full border border-neutral-300 rounded grid grid-cols-5 gap-1 p-1">
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-black rounded-sm"></div>

                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>

                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-primary rounded-sm flex items-center justify-center text-[7px] text-white font-bold">V</div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>

                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>

                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-transparent"></div>
                            <div className="bg-black rounded-sm"></div>
                            <div className="bg-black rounded-sm"></div>
                          </div>
                        </div>

                        <p className="text-[10px] text-neutral-300 font-medium mt-3 text-center">
                          Align QR code within frame
                        </p>
                      </div>

                      {/* Success Pill */}
                      <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
                        <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                        <div className="text-[11px]">
                          <p className="font-extrabold leading-tight">Vehicle Detected: KL 16 P 78</p>
                          <span className="text-[9px] text-emerald-700">Start ODO: 12,500 km</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectScreen(3)}
                        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-all mt-auto"
                      >
                        <span className="material-symbols-outlined text-sm">play_circle</span>
                        <span>Start Ride Now</span>
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* SCREEN 04: Active Ride & Live Telemetry */}
                  {/* ========================================================================= */}
                  {activeStepIndex === 3 && (
                    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span className="text-xs font-extrabold text-on-surface">Live Ride Active</span>
                        </div>
                        <span className="text-[10px] font-mono text-on-surface-variant font-bold bg-surface-container px-2 py-0.5 rounded-full">
                          {formatTimer(rideSeconds)}
                        </span>
                      </div>

                      {/* Live Telemetry Metric Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-surface p-3 rounded-2xl border border-outline-variant/60 shadow-sm text-center">
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase">Distance</span>
                          <p className="text-xl font-black text-primary">{rideDistance.toFixed(2)} <span className="text-xs font-normal text-on-surface-variant">km</span></p>
                        </div>
                        <div className="bg-surface p-3 rounded-2xl border border-outline-variant/60 shadow-sm text-center">
                          <span className="text-[9px] text-on-surface-variant font-bold uppercase">Estimated Bill</span>
                          <p className="text-xl font-black text-primary">₹{rideCost.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Mini Live Route Map with Animated Traveling Marker */}
                      <div className="h-36 rounded-2xl bg-slate-900 border border-neutral-800 relative overflow-hidden shadow-inner p-2 flex flex-col justify-between">
                        <svg className="absolute inset-0 w-full h-full" fill="none">
                          {/* Background road grid */}
                          <path d="M10 20 C 60 70, 140 10, 200 60 S 280 120, 310 80" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                          {/* Active traveled route with emerald glow */}
                          <path d="M10 20 C 60 70, 140 10, 200 60" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                          
                          {/* Start Point */}
                          <circle cx="10" cy="20" r="4" fill="#3b82f6" />
                          
                          {/* Animated Moving Vehicle Marker */}
                          <circle cx="200" cy="60" r="6" fill="#10b981" className="animate-pulse" />
                          <circle cx="200" cy="60" r="3" fill="#ffffff" />
                        </svg>

                        <div className="flex justify-between items-center relative z-10">
                          <span className="text-[9px] font-bold text-white/90 bg-black/60 backdrop-blur px-2 py-0.5 rounded">
                            Beach Rd → Mananchira
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
                            GPS 38 km/h
                          </span>
                        </div>

                        <div className="relative z-10 flex justify-between items-center text-[9px] text-slate-400">
                          <span>Start: 12,500 km</span>
                          <span>Current: {(12500 + rideDistance).toFixed(1)} km</span>
                        </div>
                      </div>

                      {/* Fuel Rate Benchmark Card */}
                      <div className="bg-surface p-2.5 rounded-xl border border-outline-variant/60 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-sm">local_gas_station</span>
                          <span className="text-[10px] font-bold text-on-surface">Benchmark: ₹104.20/L</span>
                        </div>
                        <span className="text-[9px] text-on-surface-variant font-mono">40 km/L</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectScreen(4)}
                        className="w-full py-3 rounded-xl bg-error text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
                      >
                        <span className="material-symbols-outlined text-sm">stop_circle</span>
                        <span>End Ride & Calculate</span>
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* SCREEN 05: Ride Completed */}
                  {/* ========================================================================= */}
                  {activeStepIndex === 4 && (
                    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
                      <div className="text-center pt-2 space-y-1">
                        {/* Animated Checkmark Pop */}
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-checkmark-pop shadow-sm">
                          <span className="material-symbols-outlined text-2xl font-bold">check</span>
                        </div>
                        <h4 className="font-black text-sm text-on-surface">Ride Completed</h4>
                        <p className="text-[10px] text-on-surface-variant">Honda Activa 6G • KL 16 P 78</p>
                      </div>

                      {/* Itemized Calculation Summary */}
                      <div className="bg-surface rounded-2xl p-3.5 border border-outline-variant shadow-sm space-y-2 text-xs">
                        <div className="flex justify-between items-center text-on-surface-variant text-[11px]">
                          <span>Total Distance:</span>
                          <span className="font-bold text-on-surface">18.4 km</span>
                        </div>

                        <div className="flex justify-between items-center text-on-surface-variant text-[11px]">
                          <span>Duration:</span>
                          <span className="font-bold text-on-surface">42 mins</span>
                        </div>

                        <div className="flex justify-between items-center text-on-surface-variant text-[11px]">
                          <span>Base Rental Fee:</span>
                          <span className="font-bold text-on-surface">₹399.00</span>
                        </div>

                        <div className="flex justify-between items-center text-on-surface-variant text-[11px]">
                          <span>Fuel Expense (0.46 L @ ₹104.20):</span>
                          <span className="font-bold text-on-surface">₹127.00</span>
                        </div>

                        <div className="border-t border-outline-variant/60 pt-2 flex justify-between items-center">
                          <span className="font-extrabold text-xs text-on-surface">Total Payable Amount:</span>
                          <span className="font-black text-base text-primary">₹526.00</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectScreen(5)}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
                      >
                        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                        <span>Pay ₹526 via UPI</span>
                      </button>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* SCREEN 06: Payment & Digital Invoice */}
                  {/* ========================================================================= */}
                  {activeStepIndex === 5 && (
                    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
                      <div className="text-center pt-2 space-y-1">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md animate-checkmark-pop">
                          <span className="material-symbols-outlined text-2xl font-bold">verified</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Payment Successful</p>
                        <h4 className="font-black text-2xl text-on-surface">₹526.00</h4>
                      </div>

                      {/* UPI Confirmation Details */}
                      <div className="bg-surface rounded-2xl p-3.5 border border-outline-variant shadow-sm space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                          <span>Paid To:</span>
                          <span className="font-bold text-on-surface">Robin Rentals (UPI)</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                          <span>UPI ID:</span>
                          <span className="font-mono text-on-surface">robin@okaxis</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                          <span>Txn Reference:</span>
                          <span className="font-mono text-[9px] text-on-surface">TXN_202608179921</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                          <span>Invoice Number:</span>
                          <span className="font-bold text-primary">INV-2026-0042</span>
                        </div>
                      </div>

                      {/* Payment Provider Badges */}
                      <div className="flex justify-center items-center gap-2 pt-1">
                        <span className="text-[9px] bg-surface-container font-bold px-2 py-0.5 rounded text-on-surface-variant">Google Pay</span>
                        <span className="text-[9px] bg-surface-container font-bold px-2 py-0.5 rounded text-on-surface-variant">PhonePe</span>
                        <span className="text-[9px] bg-surface-container font-bold px-2 py-0.5 rounded text-on-surface-variant">BHIM UPI</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectScreen(0)}
                        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
                      >
                        <span className="material-symbols-outlined text-sm">restart_alt</span>
                        <span>Done (Start Over)</span>
                      </button>
                    </div>
                  )}

                </div>

                {/* Bottom Smartphone Navigation Bar */}
                <div className="py-2.5 flex justify-center shrink-0 bg-surface/80 backdrop-blur-sm z-20">
                  <div className="w-28 h-1 bg-on-surface/30 rounded-full"></div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Minimalist Micro-Animation Footer: Scooter Rider Traversing along a clean path */}
        <div className="pt-6 border-t border-outline-variant/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">electric_moped</span>
              End-to-End Autonomous Mobility Fleet Experience
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">Live in Kozhikode, Kerala</span>
          </div>

          {/* Road Path with Moving Minimalist Silhouette Rider */}
          <div className="h-10 relative overflow-hidden bg-surface-container-lowest rounded-xl border border-outline-variant/40 flex items-center">
            {/* Road center dashed line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-outline-variant/60"></div>

            {/* Traveling Minimalist Scooter Rider Vector */}
            <div className="absolute animate-rider-traverse flex items-center gap-1 text-primary">
              <svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Rider Silhouette Body */}
                <circle cx="16" cy="6" r="3" fill="currentColor" />
                <path d="M14 9 L 18 13 L 23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                {/* Scooter Frame */}
                <path d="M8 18 L 17 18 L 22 13 L 26 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 13 L 24 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                {/* Rear Wheel with Rotation */}
                <g className="animate-wheel-spin origin-[8px_18px]">
                  <circle cx="8" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="8" y1="14" x2="8" y2="22" stroke="currentColor" strokeWidth="1" />
                  <line x1="4" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1" />
                </g>
                {/* Front Wheel with Rotation */}
                <g className="animate-wheel-spin origin-[26px_18px]">
                  <circle cx="26" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="26" y1="14" x2="26" y2="22" stroke="currentColor" strokeWidth="1" />
                  <line x1="22" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1" />
                </g>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
