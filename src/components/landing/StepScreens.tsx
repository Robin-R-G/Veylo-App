'use client';

import React from 'react';

interface ScreenProps {
  onNavigate: (screenIndex: number) => void;
}

function DiscoverScreen({ onNavigate }: ScreenProps) {
  return (
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

      <div className="h-44 rounded-2xl bg-slate-100 border border-outline-variant/60 relative overflow-hidden shadow-inner flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full stroke-slate-300 stroke-2" fill="none">
          <path d="M-20 40 Q 80 90, 180 50 T 360 80" strokeDasharray="4 4" />
          <path d="M40 -10 L 90 200" stroke="#cbd5e1" strokeWidth="4" />
          <path d="M120 20 Q 220 80, 260 190" stroke="#cbd5e1" strokeWidth="3" />
          <path d="M0 130 L 320 110" stroke="#e2e8f0" strokeWidth="5" />
        </svg>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 animate-radar-pulse absolute"></div>
          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg z-10">
            <span className="material-symbols-outlined text-xs">my_location</span>
          </div>
        </div>

        <div className="absolute top-8 right-12 bg-white px-1.5 py-0.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1 text-[10px] font-bold text-on-surface">
          <span>🛵</span>
          <span>2.4 km</span>
        </div>

        <div className="absolute bottom-6 left-8 bg-white px-1.5 py-0.5 rounded-full border border-outline-variant shadow-sm flex items-center gap-1 text-[10px] font-bold text-on-surface">
          <span>🚗</span>
          <span>3.1 km</span>
        </div>
      </div>

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
            <p className="text-xs font-extrabold text-primary">₹399</p>
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
        onClick={() => onNavigate(1)}
        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
      >
        <span>View Details</span>
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </button>
    </div>
  );
}

function DetailsScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <button onClick={() => onNavigate(0)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <span className="text-xs font-bold text-on-surface">Vehicle Details</span>
        <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined text-sm">share</span>
        </span>
      </div>

      <div className="h-32 rounded-2xl bg-gradient-to-br from-primary/10 to-primary-container/20 border border-outline-variant/60 flex flex-col items-center justify-center p-3 relative">
        <span className="material-symbols-outlined text-5xl text-primary">moped</span>
        <div className="absolute bottom-2 left-3 bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-on-surface shadow-sm">
          KL 16 P 78
        </div>
      </div>

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

      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-on-surface-variant font-semibold">Standard Rental Rate</p>
          <p className="text-sm font-extrabold text-on-surface">₹399 <span className="text-[10px] font-normal text-on-surface-variant">/ 24 hrs</span></p>
        </div>
        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md">
          Verified Owner
        </span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(2)}
        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
      >
        <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
        <span>Rent with QR Code</span>
      </button>
    </div>
  );
}

function ScanScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <button onClick={() => onNavigate(1)} className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <span className="text-xs font-bold text-on-surface">Scan Vehicle QR</span>
        <span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined text-sm">flash_on</span>
        </span>
      </div>

      <div className="flex-1 min-h-[220px] rounded-2xl bg-neutral-900 border-2 border-neutral-800 relative flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg"></div>
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg"></div>
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg"></div>

        <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-laser-sweep z-20"></div>

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

      <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
        <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
        <div className="text-[11px]">
          <p className="font-extrabold leading-tight">Vehicle Detected: KL 16 P 78</p>
          <span className="text-[9px] text-emerald-700">Start ODO: 12,500 km</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(3)}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700 transition-all mt-auto"
      >
        <span className="material-symbols-outlined text-sm">play_circle</span>
        <span>Start Ride Now</span>
      </button>
    </div>
  );
}

function RideScreen({ onNavigate, rideDistance, rideCost, rideSeconds }: ScreenProps & { rideDistance: number; rideCost: number; rideSeconds: number }) {
  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
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

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface p-3 rounded-2xl border border-outline-variant/60 shadow-sm text-center">
          <span className="text-[9px] text-on-surface-variant font-bold uppercase">Distance</span>
          <p className="text-xl font-extrabold text-primary">{rideDistance.toFixed(2)} <span className="text-xs font-normal text-on-surface-variant">km</span></p>
        </div>
        <div className="bg-surface p-3 rounded-2xl border border-outline-variant/60 shadow-sm text-center">
          <span className="text-[9px] text-on-surface-variant font-bold uppercase">Estimated Bill</span>
          <p className="text-xl font-extrabold text-primary">₹{rideCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="h-36 rounded-2xl bg-slate-900 border border-neutral-800 relative overflow-hidden shadow-inner p-2 flex flex-col justify-between">
        <svg className="absolute inset-0 w-full h-full" fill="none">
          <path d="M10 20 C 60 70, 140 10, 200 60 S 280 120, 310 80" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <path d="M10 20 C 60 70, 140 10, 200 60" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
          <circle cx="10" cy="20" r="4" fill="#3b82f6" />
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

      <div className="bg-surface p-2.5 rounded-xl border border-outline-variant/60 flex justify-between items-center text-xs">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-sm">local_gas_station</span>
          <span className="text-[10px] font-bold text-on-surface">Benchmark: ₹104.20/L</span>
        </div>
        <span className="text-[9px] text-on-surface-variant font-mono">40 km/L</span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(4)}
        className="w-full py-3 rounded-xl bg-error text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
      >
        <span className="material-symbols-outlined text-sm">stop_circle</span>
        <span>End Ride & Calculate</span>
      </button>
    </div>
  );
}

function CompleteScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
      <div className="text-center pt-2 space-y-1">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-checkmark-pop shadow-sm">
          <span className="material-symbols-outlined text-2xl font-bold">check</span>
        </div>
        <h4 className="font-extrabold text-sm text-on-surface">Ride Completed</h4>
        <p className="text-[10px] text-on-surface-variant">Honda Activa 6G • KL 16 P 78</p>
      </div>

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
          <span className="font-extrabold text-base text-primary">₹526.00</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(5)}
        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
      >
        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
        <span>Pay ₹526 via UPI</span>
      </button>
    </div>
  );
}

function PaymentScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="p-4 flex flex-col h-full space-y-3 animate-fadeIn">
      <div className="text-center pt-2 space-y-1">
        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md animate-checkmark-pop">
          <span className="material-symbols-outlined text-2xl font-bold">verified</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Payment Successful</p>
        <h4 className="font-extrabold text-2xl text-on-surface">₹526.00</h4>
      </div>

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

      <div className="flex justify-center items-center gap-2 pt-1">
        <span className="text-[9px] bg-surface-container font-bold px-2 py-0.5 rounded text-on-surface-variant">Google Pay</span>
        <span className="text-[9px] bg-surface-container font-bold px-2 py-0.5 rounded text-on-surface-variant">PhonePe</span>
        <span className="text-[9px] bg-surface-container font-bold px-2 py-0.5 rounded text-on-surface-variant">BHIM UPI</span>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(0)}
        className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all mt-auto"
      >
        <span className="material-symbols-outlined text-sm">restart_alt</span>
        <span>Done (Start Over)</span>
      </button>
    </div>
  );
}

interface StepScreensProps {
  activeStepIndex: number;
  onNavigate: (screenIndex: number) => void;
  rideDistance: number;
  rideCost: number;
  rideSeconds: number;
}

export function StepScreens({ activeStepIndex, onNavigate, rideDistance, rideCost, rideSeconds }: StepScreensProps) {
  switch (activeStepIndex) {
    case 0: return <DiscoverScreen onNavigate={onNavigate} />;
    case 1: return <DetailsScreen onNavigate={onNavigate} />;
    case 2: return <ScanScreen onNavigate={onNavigate} />;
    case 3: return <RideScreen onNavigate={onNavigate} rideDistance={rideDistance} rideCost={rideCost} rideSeconds={rideSeconds} />;
    case 4: return <CompleteScreen onNavigate={onNavigate} />;
    case 5: return <PaymentScreen onNavigate={onNavigate} />;
    default: return null;
  }
}
