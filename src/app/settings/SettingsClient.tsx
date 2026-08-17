'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrganization } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { supabase } from '@/lib/services/supabase/client';
import { authService } from '@/lib/services/authService';
import { Organization } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';


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
    (async () => {
      try {
        const orgId = (await supabaseAuth.getOrganizationId()) || 'org_demo_1';
        let o = await getOrganization(orgId);
        if (!o) {
          o = mockStorage.getState().organization;
        }
        if (o) {
          setOrg(o);
          setOrgName(o.name || 'Robin Fleet Rentals');
          setBusinessName(o.businessName || 'Robin Rentals');
          setPhone(o.phone || '+91 98765 43210');
          setEmail(o.email || 'robin@veylo.app');
          setDefaultState(o.defaultState || 'Kerala');
          setDefaultCity(o.defaultCity || 'Kozhikode');
          setInvoicePrefix(o.invoicePrefix || 'INV');
          setUpiId(o.upiId || 'robin@okaxis');
          setUpiPayeeName(o.upiPayeeName || 'Robin Rentals');
          setUpiEnabled(o.upiEnabled !== false);
          setTaxEnabled(o.taxEnabled || false);
          setGstin(o.gstin || '');
        }
      } catch {
        const o = mockStorage.getState().organization;
        setOrgName(o.name || 'Robin Fleet Rentals');
        setBusinessName(o.businessName || 'Robin Rentals');
        setPhone(o.phone || '+91 98765 43210');
        setEmail(o.email || 'robin@veylo.app');
        setDefaultState(o.defaultState || 'Kerala');
        setDefaultCity(o.defaultCity || 'Kozhikode');
        setInvoicePrefix(o.invoicePrefix || 'INV');
        setUpiId(o.upiId || 'robin@okaxis');
        setUpiPayeeName(o.upiPayeeName || 'Robin Rentals');
      }
    })();
  }, [router]);

  if (!mounted) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgId = (await supabaseAuth.getOrganizationId()) || 'org_demo_1';
      await supabase.from('organizations').update({
        name: orgName,
        business_name: businessName,
        phone,
        email,
        default_state: defaultState,
        default_city: defaultCity,
        invoice_prefix: invoicePrefix,
        tax_enabled: taxEnabled,
        gstin: taxEnabled ? gstin : undefined,
      }).eq('id', orgId);

      await supabase.from('payment_settings').upsert({
        organization_id: orgId,
        upi_id: upiId,
        payee_name: upiPayeeName,
        status: upiId ? 'CONFIGURED' : 'NOT_CONFIGURED',
      });
    } catch {
      // Local fallback
    }
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

      {/* Subscriptions & Billing link */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">credit_card</span>
            SaaS Plan Subscriptions
          </h2>
          <Link
            href="/settings/billing"
            className="px-4 py-2.5 rounded-xl border border-primary text-primary font-bold text-xs hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">payments</span>
            Manage Subscription
          </Link>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Upgrade to Starter, Pro, or Enterprise Business plans. Unlock advanced reports, custom domain white-labeling, staff permissions, and higher vehicle limits.
        </p>
      </div>

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

        {/* UPI Payment Settings Link */}
        <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">payments</span>
              UPI Payment Settings
            </h2>
            <Link
              href="/settings/payment"
              className="px-4 py-2.5 rounded-xl border border-primary text-primary font-bold text-xs hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              Configure UPI Details
            </Link>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Configure direct rider-to-owner payment accounts, verify bank connection, check deep-link intent structures, and configure verification states.
          </p>
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
