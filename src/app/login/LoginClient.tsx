'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

type Tab = 'owner' | 'rider';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  
  const [activeTab, setActiveTab] = useState<Tab>('rider');
  const [mounted, setMounted] = useState(false);

  // Owner form
  const [ownerName, setOwnerName] = useState('Robin');
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerError, setOwnerError] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Rider form
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderError, setRiderError] = useState('');
  const [riderLoading, setRiderLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Redirect if already authenticated
    const session = authService.getSession();
    if (session) {
      if (session.role === 'OWNER' || session.role === 'ADMIN') {
        router.replace('/dashboard');
      } else {
        router.replace('/rider/dashboard');
      }
    }
  }, [router]);

  if (!mounted) return null;

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    setOwnerLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = authService.loginAsOwner(ownerName, ownerPin);
    setOwnerLoading(false);
    if (!result.success) {
      setOwnerError(result.error || 'Login failed.');
      return;
    }
    router.push(redirect.startsWith('/rider') ? '/dashboard' : redirect);
  };

  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRiderError('');
    setRiderLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const result = authService.loginAsRider(riderName, riderPhone);
    setRiderLoading(false);
    if (!result.success) {
      setRiderError(result.error || 'Registration failed.');
      return;
    }
    router.push('/rider/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary p-3 flex items-center justify-center mx-auto shadow-md">
            <VeyloLogo className="w-full h-full" color="white" />
          </div>
          <h1 className="text-3xl font-extrabold text-on-background tracking-tight">Veylo</h1>
          <p className="text-sm text-on-surface-variant">Move. Track. Pay.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant">
          <button
            onClick={() => setActiveTab('rider')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'rider'
                ? 'bg-primary text-on-primary shadow'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">two_wheeler</span>
            I'm a Rider
          </button>
          <button
            onClick={() => setActiveTab('owner')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'owner'
                ? 'bg-primary text-on-primary shadow'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">business</span>
            I'm an Owner
          </button>
        </div>

        {/* Rider Panel */}
        {activeTab === 'rider' && (
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-on-surface">Start Riding</h2>
              <p className="text-xs text-on-surface-variant">
                Enter your name and phone to begin. No password needed.
              </p>
            </div>

            {riderError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex gap-2 items-center">
                <span className="material-symbols-outlined text-sm">error</span>
                {riderError}
              </div>
            )}

            <form onSubmit={handleRiderLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">Your Name</label>
                <input
                  type="text"
                  id="rider-name"
                  placeholder="e.g. Arjun Kumar"
                  value={riderName}
                  onChange={e => setRiderName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  id="rider-phone"
                  placeholder="+91 98765 43210"
                  value={riderPhone}
                  onChange={e => setRiderPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={riderLoading}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {riderLoading ? (
                  <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Entering...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">login</span> Enter as Rider</>
                )}
              </button>
            </form>

            <p className="text-[11px] text-on-surface-variant text-center">
              📍 Location access is needed for automatic kilometer tracking
            </p>
          </div>
        )}

        {/* Owner Panel */}
        {activeTab === 'owner' && (
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-on-surface">Owner Login</h2>
              <p className="text-xs text-on-surface-variant">
                Sign in to manage your fleet, rentals, and earnings.
              </p>
            </div>

            {ownerError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex gap-2 items-center">
                <span className="material-symbols-outlined text-sm">error</span>
                {ownerError}
              </div>
            )}

            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">Owner Name</label>
                <input
                  type="text"
                  id="owner-name"
                  placeholder="Your name"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Access PIN
                  <span className="ml-2 text-on-surface-variant font-normal">(Demo PIN: 1234)</span>
                </label>
                <input
                  type="password"
                  id="owner-pin"
                  placeholder="••••"
                  value={ownerPin}
                  onChange={e => setOwnerPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm tracking-[0.5em]"
                  required
                  maxLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={ownerLoading}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {ownerLoading ? (
                  <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Signing in...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">lock_open</span> Sign In as Owner</>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-[11px] text-on-surface-variant">
          Veylo — Secure Vehicle Rental Billing Platform
        </p>
      </div>
    </div>
  );
}
