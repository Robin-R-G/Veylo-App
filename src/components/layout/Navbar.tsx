'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mockStorage } from '@/lib/services/mockStorage';
import { PlanTier } from '@/types';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [currentTier, setCurrentTier] = useState<PlanTier>('FREE');

  useEffect(() => {
    const state = mockStorage.getState();
    setCurrentTier(state.currentTier);
  }, []);

  const handleTierSwitch = (tier: PlanTier) => {
    mockStorage.setTier(tier);
    setCurrentTier(tier);
  };

  const isLandingPage = pathname === '/';

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between transition-all w-full">
      
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary text-on-primary font-bold flex items-center justify-center text-sm shadow">
            VL
          </div>
          <div>
            <span className="text-lg font-extrabold text-primary tracking-tight block leading-tight">
              Veylo
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium hidden sm:block leading-tight">
              Move. Track. Pay.
            </span>
          </div>
        </Link>
      </div>

      {/* Desktop Links (If Landing Page) */}
      {isLandingPage && (
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
          <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        </div>
      )}

      {/* Right Action Bar: Demo QR Link & Plan Switcher */}
      <div className="flex items-center gap-3">
        
        {/* Quick QR Scan Link */}
        <Link
          href="/v/pub_kl16p78_x99a"
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-low text-primary transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
          Demo Customer QR
        </Link>

        {/* Plan Switcher */}
        <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant">
          <button
            onClick={() => handleTierSwitch('FREE')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              currentTier === 'FREE' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            FREE
          </button>
          <button
            onClick={() => handleTierSwitch('PRO')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              currentTier === 'PRO' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            PRO
          </button>
          <button
            onClick={() => handleTierSwitch('BUSINESS')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              currentTier === 'BUSINESS' ? 'bg-tertiary-container text-on-tertiary-container shadow-sm' : 'text-on-surface-variant hover:text-tertiary'
            }`}
          >
            BIZ
          </button>
        </div>
      </div>
    </header>
  );
};
