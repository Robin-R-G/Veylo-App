'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/services/authService';
import { VeyloLogo } from '@/components/ui/VeyloLogo';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (authService.isPlatformAdmin()) {
      router.replace('/admin');
    }
  }, [router]);

  if (!mounted) return (
    <div className="admin-theme min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto bg-slate-800" />
          <Skeleton className="h-7 w-48 mx-auto bg-slate-800" />
          <Skeleton className="h-4 w-64 mx-auto bg-slate-800" />
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <Skeleton className="h-10 w-full bg-slate-800 rounded-xl" />
          <Skeleton className="h-10 w-full bg-slate-800 rounded-xl" />
          <Skeleton className="h-11 w-full bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await authService.loginAsAdmin(email, password);
    if (result.success) {
      router.push('/admin');
    } else {
      setError(result.error || 'Authentication failed. Please verify credentials.');
    }
    setIsLoading(false);
  };

  return (
    <div className="admin-theme min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        
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

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base">lock</span>
              <span className="text-xs font-bold text-slate-200">Restricted Access</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">SUPABASE AUTH</span>
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
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@veylo.app"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
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
              {isLoading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center">
            Admin accounts are created via Supabase Auth with ADMIN role in profiles table.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">storefront</span>
            Fleet Owner Login
          </Link>
          <span>•</span>
          <Link href="/rider" className="hover:text-white transition-skip transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">two_wheeler</span>
            Rider Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
