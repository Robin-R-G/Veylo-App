'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockStorage } from '@/lib/services/mockStorage';
import { authService } from '@/lib/services/authService';
import { Organization } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

export default function SettingsClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [defaultState, setDefaultState] = useState('');
  const [defaultCity, setDefaultCity] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [gstin, setGstin] = useState('');

  useEffect(() => {
    setMounted(true);
    const session = authService.getSession();
    if (!session || session.role === 'RIDER') {
      router.replace('/login');
      return;
    }
    const state = mockStorage.getState();
    const o = state.organization;
    setOrg(o);
    setOrgName(o.name || '');
    setBusinessName(o.businessName || '');
    setPhone(o.phone || '');
    setEmail(o.email || '');
    setDefaultState(o.defaultState || 'Kerala');
    setDefaultCity(o.defaultCity || 'Kozhikode');
    setInvoicePrefix(o.invoicePrefix || 'INV');
    setUpiId(o.upiId || '');
    setUpiPayeeName(o.upiPayeeName || '');
    setUpiEnabled(o.upiEnabled !== false);
    setTaxEnabled(o.taxEnabled || false);
    setGstin(o.gstin || '');
  }, [router]);

  if (!mounted) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save organization settings
    const store = mockStorage.getState();
    store.organization = {
      ...store.organization,
      name: orgName,
      businessName,
      phone,
      email,
      defaultState,
      defaultCity,
      invoicePrefix,
      upiId,
      upiPayeeName,
      upiEnabled,
      taxEnabled,
      gstin: taxEnabled ? gstin : undefined,
    };
    // Use the public API to save UPI settings
    mockStorage.updateOwnerUpiSettings(upiId, upiPayeeName, upiEnabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => {
    authService.clearSession();
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your organization details, UPI payments, and platform preferences"
        icon="settings"
        backHref="/dashboard"
      />

      <form onSubmit={handleSave} className="space-y-6">

        {/* Organization Details */}
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">business</span>
            Organization Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Organization Name</label>
              <input
                type="text"
                id="org-name"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Business / Trade Name</label>
              <input
                type="text"
                id="business-name"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Phone</label>
              <input
                type="tel"
                id="org-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Email</label>
              <input
                type="email"
                id="org-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Default State</label>
              <input
                type="text"
                id="default-state"
                value={defaultState}
                onChange={e => setDefaultState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Default City</label>
              <input
                type="text"
                id="default-city"
                value={defaultCity}
                onChange={e => setDefaultCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Invoice Number Prefix</label>
              <input
                type="text"
                id="invoice-prefix"
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono uppercase"
                placeholder="INV"
              />
            </div>
          </div>
        </div>

        {/* UPI Payment Settings */}
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">payments</span>
              UPI Payment Settings
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-medium text-on-surface-variant">Enabled</span>
              <div
                onClick={() => setUpiEnabled(!upiEnabled)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${upiEnabled ? 'bg-primary' : 'bg-outline'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${upiEnabled ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">UPI ID</label>
              <input
                type="text"
                id="upi-id"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="yourname@paytm"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Payee Display Name</label>
              <input
                type="text"
                id="upi-payee-name"
                value={upiPayeeName}
                onChange={e => setUpiPayeeName(e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>
          </div>

          {upiId && (
            <div className="p-3 rounded-xl bg-primary-container text-on-primary-container text-xs">
              <p className="font-semibold mb-1">Payment Link Preview:</p>
              <p className="font-mono break-all">upi://pay?pa={upiId}&pn={encodeURIComponent(upiPayeeName)}&cu=INR</p>
            </div>
          )}
        </div>

        {/* GST / Tax Settings */}
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">receipt</span>
              GST / Tax Settings
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-medium text-on-surface-variant">GST Enabled</span>
              <div
                onClick={() => setTaxEnabled(!taxEnabled)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${taxEnabled ? 'bg-primary' : 'bg-outline'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${taxEnabled ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>

          {!taxEnabled && (
            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant">
              💡 GST is disabled. Invoices will show zero tax. Enable only if your business is GST registered.
            </div>
          )}

          {taxEnabled && (
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">GSTIN</label>
              <input
                type="text"
                id="gstin"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono uppercase"
              />
            </div>
          )}
        </div>

        {/* Save + Logout */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Save Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-5 py-3.5 rounded-xl bg-error-container text-on-error-container font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Settings saved successfully!
          </div>
        )}
      </form>
    </div>
  );
}
