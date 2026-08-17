'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('superadmin@veylo.app');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already logged in as platform admin, redirect to admin center
    if (authService.isPlatformAdmin()) {
      router.replace('/admin');
    }
  }, [router]);

  if (!mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = authService.loginAsAdmin(identifier, pin);
    if (result.success) {
      router.push('/admin');
    } else {
      setError(result.error || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setIdentifier('superadmin@veylo.app');
    setPin('admin2024');
  };

  return (
    <div className="admin-theme min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      
      {/* Background glowing gradient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 p-3 shadow-xl shadow-amber-500/20">
            <VeyloLogo className="w-full h-full" color="black" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Veylo Admin Portal</h1>
              <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase">
                SECURE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Platform Operations & Fuel Rate Authority</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base">lock</span>
              <span className="text-xs font-bold text-slate-200">Restricted Access</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">SUPABASE RLS</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Admin Email / Identifier
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="superadmin@veylo.app"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Security PIN / Master Password
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter security key..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider mt-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">vpn_key</span>
              {isLoading ? 'Authenticating...' : 'Authenticate Super Admin'}
            </button>
          </form>

          {/* Quick Demo Assist */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Authorized Demo Mode?</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
            >
              Fill Credentials
            </button>
          </div>
        </div>

        {/* Navigation Portals */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">storefront</span>
            Fleet Owner Login
          </Link>
          <span>•</span>
          <Link href="/rider" className="hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">two_wheeler</span>
            Rider Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
