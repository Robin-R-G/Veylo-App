'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authService } from '@/lib/services/authService';
import { PlanTier, AppSession, Organization } from '@/types';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [org, setOrg] = useState<Organization | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    setSession(authService.getSession());

    const supabase = createClient();
    async function loadOrg() {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();

      if (data) {
        setOrg({
          id: data.id,
          name: data.name,
          slug: data.slug,
          planTier: data.plan_tier,
          businessName: data.business_name,
          logoUrl: data.logo_url,
          phone: data.phone,
          email: data.email,
          defaultState: data.default_state,
          defaultCity: data.default_city,
          upiId: data.upi_id,
          upiPayeeName: data.upi_payee_name,
          upiEnabled: data.upi_enabled,
          upiStatus: data.upi_status,
          taxEnabled: data.tax_enabled,
          gstin: data.gstin,
          cgstRate: data.cgst_rate,
          sgstRate: data.sgst_rate,
          igstRate: data.igst_rate,
          invoicePrefix: data.invoice_prefix,
          createdAt: data.created_at,
        });
      }
    }
    loadOrg();
  }, []);

  const currentTier: PlanTier = org?.planTier || 'FREE';
  const isLandingPage = pathname === '/';
  const isOwner = session?.role === 'OWNER' || session?.role === 'ADMIN';

  const tierBadgeColor: Record<PlanTier, string> = {
    FREE: 'bg-surface text-on-surface',
    PRO: 'bg-primary text-on-primary',
    BUSINESS: 'bg-tertiary-container text-on-tertiary-container',
  };

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between transition-all w-full">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
            <VeyloLogo className="w-full h-full" color="white" />
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

      {/* Desktop Navigation Links */}
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
        <Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
        <Link href="/#features" className="hover:text-primary transition-colors">Features</Link>
        <Link href="/#pricing" className="hover:text-primary transition-colors">Pricing</Link>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        
        {/* Session Badge or Login */}
        {session ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              session.role === 'RIDER' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-container text-on-primary-container'
            }`}>
              {session.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-on-surface">{session.name}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
              session.role === 'RIDER' ? 'bg-emerald-100 text-emerald-700' :
              session.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' :
              'bg-primary-container text-on-primary-container'
            }`}>{session.role}</span>
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-primary hover:text-on-primary hover:border-primary text-primary transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            Sign In
          </Link>
        )}

        {/* Quick QR Scan Link */}
        <Link
          href="/v/pub_kl16p78_x99a"
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-low text-primary transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
          Demo QR
        </Link>

        {/* Current Plan Badge (owners only) */}
        {isOwner && (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${tierBadgeColor[currentTier]}`}>
            {currentTier}
          </span>
        )}
      </div>
    </header>
  );
};
