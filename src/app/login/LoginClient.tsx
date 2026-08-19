'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import { isPasskeySupported, hasPasskeyRegistered } from '@/lib/passkey';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

type Tab = 'owner' | 'rider';
type OwnerMode = 'login' | 'signup';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = (() => {
    const raw = searchParams.get('redirect') || '/dashboard';
    // Sanitize: only allow relative paths, block protocol-relative URLs and external domains
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return '/dashboard';
      return url.pathname + url.search;
    } catch {
      return '/dashboard';
    }
  })();

  const [activeTab, setActiveTab] = useState<Tab>('owner');
  const [ownerMode, setOwnerMode] = useState<OwnerMode>('login');
  const [mounted, setMounted] = useState(false);

  // Owner form
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerError, setOwnerError] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Passkey state
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Rider form
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderError, setRiderError] = useState('');
  const [riderLoading, setRiderLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPasskeySupported(isPasskeySupported());
  }, [router]);

  if (!mounted) return null;

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    setOwnerLoading(true);

    const result = ownerMode === 'signup'
      ? await authService.signupOwner(ownerEmail, ownerPassword, ownerName, ownerPhone)
      : await authService.loginAsOwner(ownerEmail, ownerPassword);

    setOwnerLoading(false);
    if (!result.success) {
      setOwnerError(result.error || 'Authentication failed.');
      return;
    }

    // After signup, prompt to register passkey
    if (ownerMode === 'signup' && passkeySupported && !hasPasskeyRegistered(ownerEmail)) {
      setRegisteredEmail(ownerEmail);
      setShowPasskeyPrompt(true);
      return;
    }

    router.push(redirect.startsWith('/rider') ? '/dashboard' : redirect);
  };

  const handlePasskeyLogin = async () => {
    setPasskeyError('');
    setPasskeyLoading(true);

    const result = await authService.loginWithPasskey(ownerEmail || registeredEmail);
    setPasskeyLoading(false);

    if (!result.success) {
      setPasskeyError(result.error || 'Passkey login failed.');
      return;
    }

    router.push(redirect.startsWith('/rider') ? '/dashboard' : redirect);
  };

  const handleRegisterPasskey = async () => {
    setPasskeyError('');
    setPasskeyLoading(true);

    const result = await authService.registerUserPasskey(
      registeredEmail,
      ownerName || registeredEmail.split('@')[0],
      ownerPassword,
    );

    setPasskeyLoading(false);
    if (!result.success) {
      setPasskeyError(result.error || 'Failed to register passkey.');
      return;
    }

    setShowPasskeyPrompt(false);
    router.push(redirect.startsWith('/rider') ? '/dashboard' : redirect);
  };

  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRiderError('');
    setRiderLoading(true);
    const result = await authService.loginAsRider(riderName, riderPhone);
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
          <p className="text-sm text-on-surface-variant">Sign in to manage your vehicles</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant">
          <button
            onClick={() => setActiveTab('owner')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'owner'
                ? 'bg-primary text-on-primary shadow'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">business</span>
            Owner
          </button>
          <button
            onClick={() => setActiveTab('rider')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'rider'
                ? 'bg-primary text-on-primary shadow'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-1 align-middle">two_wheeler</span>
            Rider
          </button>
        </div>

        {/* Passkey Registration Prompt */}
        {showPasskeyPrompt && (
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
            <div className="text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-primary">passkey</span>
              <h2 className="text-lg font-bold text-on-surface">Register a Passkey?</h2>
              <p className="text-xs text-on-surface-variant">
                Use your fingerprint, Face ID, or security key for faster sign-in next time.
              </p>
            </div>

            {passkeyError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex gap-2 items-center">
                <span className="material-symbols-outlined text-sm">error</span>
                {passkeyError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasskeyPrompt(false);
                  router.push(redirect.startsWith('/rider') ? '/dashboard' : redirect);
                }}
                className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-all"
              >
                Skip
              </button>
              <button
                onClick={handleRegisterPasskey}
                disabled={passkeyLoading}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {passkeyLoading ? (
                  <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Setting up...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">passkey</span> Register Passkey</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Owner Panel */}
        {!showPasskeyPrompt && activeTab === 'owner' && (
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-on-surface">
                {ownerMode === 'signup' ? 'Create Account' : 'Owner Login'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {ownerMode === 'signup'
                  ? 'Sign up to manage your fleet, rentals, and earnings.'
                  : 'Sign in to manage your fleet, rentals, and earnings.'}
              </p>
            </div>

            {ownerError && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex gap-2 items-center">
                <span className="material-symbols-outlined text-sm">error</span>
                {ownerError}
              </div>
            )}

            <form onSubmit={handleOwnerLogin} className="space-y-4">
              {ownerMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Robin Raj"
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1.5">Phone (optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={ownerPhone}
                      onChange={e => setOwnerPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={ownerLoading}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {ownerLoading ? (
                  <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> {ownerMode === 'signup' ? 'Creating Account...' : 'Signing in...'}</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">{ownerMode === 'signup' ? 'person_add' : 'lock_open'}</span> {ownerMode === 'signup' ? 'Create Account' : 'Sign In'}</>
                )}
              </button>
            </form>

            {/* Passkey Login (login mode only) */}
            {ownerMode === 'login' && passkeySupported && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface px-2 text-on-surface-variant">or</span>
                  </div>
                </div>

                {passkeyError && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex gap-2 items-center">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {passkeyError}
                  </div>
                )}

                <button
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  className="w-full py-3.5 rounded-xl border-2 border-primary text-primary font-bold text-sm uppercase tracking-wider hover:bg-primary/5 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {passkeyLoading ? (
                    <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Verifying...</>
                  ) : (
                    <><span className="material-symbols-outlined text-sm">passkey</span> Sign in with Passkey</>
                  )}
                </button>
              </>
            )}

            <div className="text-center">
              <button
                onClick={() => {
                  setOwnerMode(ownerMode === 'login' ? 'signup' : 'login');
                  setOwnerError('');
                  setPasskeyError('');
                }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {ownerMode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        )}

        {/* Rider Panel */}
        {!showPasskeyPrompt && activeTab === 'rider' && (
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-on-surface">Start Riding</h2>
              <p className="text-xs text-on-surface-variant">
                Enter your name and phone to begin.
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
              Location access is needed for automatic kilometer tracking
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-on-surface-variant">
          Veylo — Secure Vehicle Rental Billing Platform
        </p>
      </div>
    </div>
  );
}
