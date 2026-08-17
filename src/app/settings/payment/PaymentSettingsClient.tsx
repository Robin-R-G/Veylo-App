'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrganization } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { supabase } from '@/lib/services/supabase/client';
import { authService } from '@/lib/services/authService';
import { Organization, UpiStatus } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { mockStorage } from '@/lib/services/mockStorage';

export default function PaymentSettingsClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [upiStatus, setUpiStatus] = useState<UpiStatus>('NOT_CONFIGURED');
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  
  // UI states
  const [isVerifying, setIsVerifying] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [validationMsg, setValidationMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    const session = authService.getSession();
    if (!session || session.role === 'RIDER') {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const orgId = (await supabaseAuth.getOrganizationId()) || 'org_demo_1';
        let o = await getOrganization(orgId);
        if (!o) {
          o = mockStorage.getState().organization;
        }
        setOrg(o);
        setUpiId(o.upiId || 'robin@okaxis');
        setUpiPayeeName(o.upiPayeeName || 'Robin Rentals');
        setUpiEnabled(o.upiEnabled !== false);
        setUpiStatus(o.upiStatus || 'ACTIVE');
        setVerifiedAt(o.upiVerifiedAt || new Date().toISOString());
      } catch {
        const o = mockStorage.getState().organization;
        setOrg(o);
        setUpiId(o.upiId || 'robin@okaxis');
        setUpiPayeeName(o.upiPayeeName || 'Robin Rentals');
        setUpiEnabled(true);
        setUpiStatus('ACTIVE');
      }
    })();
  }, [router]);

  if (!mounted || !org) return null;

  // Format validation
  const validateUpiFormat = (id: string): boolean => {
    if (!id.trim()) {
      setValidationMsg('');
      return false;
    }
    // Standard UPI ID validation regex
    const regex = /^[\w.\-_]{2,256}@[\w.\-_]{2,256}$/;
    if (!regex.test(id.trim())) {
      setValidationMsg('⚠️ Invalid UPI ID format. Should be like name@handle (e.g. ownername@upi)');
      return false;
    }
    setValidationMsg('');
    return true;
  };

  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUpiId(value);
    validateUpiFormat(value);
    
    // Automatically transition to CONFIGURED if updated from empty
    if (value && upiStatus === 'NOT_CONFIGURED') {
      setUpiStatus('CONFIGURED');
    } else if (!value) {
      setUpiStatus('NOT_CONFIGURED');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveMsg('');

    if (upiId && !validateUpiFormat(upiId)) {
      setErrorMsg('Please correct the UPI ID format before saving.');
      return;
    }

    const orgId = await supabaseAuth.getOrganizationId();
    if (!orgId) return;

    await supabase.from('payment_settings').upsert({
      organization_id: orgId,
      upi_id: upiId,
      payee_name: upiPayeeName,
      status: upiStatus,
    });

    setSaveMsg('UPI ID saved successfully.');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // Simulate bank account routing check
  const handleVerifyUpi = async () => {
    if (!upiId || !validateUpiFormat(upiId)) {
      setErrorMsg('Enter a valid UPI ID to verify.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');
    setSaveMsg('');
    setUpiStatus('VERIFICATION_REQUIRED');

    // Simulate verification delay
    setTimeout(async () => {
      setIsVerifying(false);
      setUpiStatus('ACTIVE');
      setVerifiedAt(new Date().toISOString());
      
      const orgId = await supabaseAuth.getOrganizationId();
      if (orgId) {
        await supabase.from('payment_settings').upsert({
          organization_id: orgId,
          upi_id: upiId,
          payee_name: upiPayeeName,
          status: 'ACTIVE',
        });
      }

      setSaveMsg('✅ UPI account successfully verified and activated.');
      setTimeout(() => setSaveMsg(''), 4000);
    }, 2500);
  };

  const getStatusBadgeClass = (status: UpiStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CONFIGURED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VERIFICATION_REQUIRED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant';
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Payment Settings"
        subtitle="Configure your UPI destination details to receive rental payments directly"
        icon="payments"
        backHref="/settings"
      />

      {saveMsg && (
        <div className="p-4 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-300 shadow-sm animate-pulse">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {saveMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error shadow-sm">
          <span className="material-symbols-outlined text-sm">report_problem</span>
          {errorMsg}
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-6">
        
        {/* Status indicator banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant">
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Configuration Status</span>
            <span className="font-extrabold text-base text-on-surface mt-1 block">
              {upiStatus.replace('_', ' ')}
            </span>
            {verifiedAt && upiStatus === 'ACTIVE' && (
              <span className="text-[10px] text-on-surface-variant mt-0.5 block">
                Verified on {new Date(verifiedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeClass(upiStatus)}`}>
            {upiStatus}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface">Owner Receiving Details</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-semibold text-on-surface-variant">Enabled</span>
              <div
                onClick={() => setUpiEnabled(!upiEnabled)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${upiEnabled ? 'bg-primary' : 'bg-outline'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${upiEnabled ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">UPI ID (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={handleUpiChange}
                placeholder="ownername@upi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono"
              />
              {validationMsg && (
                <p className="text-[10px] text-error font-medium mt-1">{validationMsg}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Payee Display Name</label>
              <input
                type="text"
                value={upiPayeeName}
                onChange={e => setUpiPayeeName(e.target.value)}
                placeholder="Robin Vehicle Rentals"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-semibold"
              />
              <span className="text-[10px] text-on-surface-variant mt-1.5 block leading-relaxed">
                ⚠️ Specify the exact display name registered with your bank account to avoid transaction blocks.
              </span>
            </div>

            {/* Status override select */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Configure Status (Manual)</label>
              <select
                value={upiStatus}
                onChange={e => setUpiStatus(e.target.value as UpiStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-semibold"
              >
                <option value="NOT_CONFIGURED">Not Configured</option>
                <option value="CONFIGURED">Configured (Unverified)</option>
                <option value="VERIFICATION_REQUIRED">Verification Required</option>
                <option value="ACTIVE">Active (Verified)</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save UPI Details
            </button>

            <button
              type="button"
              onClick={handleVerifyUpi}
              disabled={isVerifying || !upiId}
              className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                isVerifying 
                  ? 'bg-surface-container text-on-surface-variant border-outline-variant' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${isVerifying ? 'animate-spin' : ''}`}>
                {isVerifying ? 'sync' : 'verified_user'}
              </span>
              {isVerifying ? 'Verifying Account...' : 'Simulate Bank Verification'}
            </button>
          </div>
        </form>

        {upiId && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-2">
            <span className="font-bold text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">qr_code</span>
              UPI DEEP LINK URI
            </span>
            <p className="font-mono text-[10px] break-all p-2.5 rounded bg-surface border border-outline-variant text-on-surface-variant">
              upi://pay?pa={upiId}&pn={encodeURIComponent(upiPayeeName)}&cu=INR
            </p>
          </div>
        )}
      </div>

      {/* Security Info Card */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-700 mt-0.5">security</span>
        <div className="space-y-1">
          <p className="font-bold text-amber-950">Strict Security Policy</p>
          <p className="leading-relaxed">
            Veylo never stores sensitive bank details, OTPs, PINs, passwords, or transaction verification tokens. Payment is routed directly between the rider app and your personal bank account.
          </p>
        </div>
      </div>
    </div>
  );
}
