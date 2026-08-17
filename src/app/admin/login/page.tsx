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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto bg-surface-container-low" />
          <Skeleton className="h-7 w-48 mx-auto bg-surface-container-low" />
          <Skeleton className="h-4 w-64 mx-auto bg-surface-container-low" />
        </div>
        <div className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-4">
          <Skeleton className="h-10 w-full bg-surface-container-low rounded-xl" />
          <Skeleton className="h-10 w-full bg-surface-container-low rounded-xl" />
          <Skeleton className="h-11 w-full bg-surface-container-low rounded-xl" />
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-on-primary">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-tertiary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-on-primary p-3 shadow-md">
            <VeyloLogo className="w-full h-full" color="black" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Veylo Admin Portal</h1>
              <span className="text-[10px] font-extrabold bg-primary text-on-primary px-2 py-0.5 rounded uppercase">
                SECURE
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Platform Operations & Fuel Rate Authority</p>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-md backdrop-blur-xl space-y-5">
          
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">lock</span>
              <span className="text-xs font-bold text-on-surface">Restricted Access</span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-mono">SUPABASE AUTH</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-error-container border border-error/40 text-on-error-container text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-on-surface font-semibold mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@veylo.app"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-on-surface font-semibold mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider mt-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">vpn_key</span>
              {isLoading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>

          <p className="text-[11px] text-on-surface-variant text-center">
            Admin accounts are created via Supabase Auth with ADMIN role in profiles table.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-on-surface-variant">
          <Link href="/login" className="hover:text-on-surface transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">storefront</span>
            Fleet Owner Login
          </Link>
          <span>•</span>
          <Link href="/rider" className="hover:text-on-surface transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">two_wheeler</span>
            Rider Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
