'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import { PageHeader } from '@/components/ui/PageHeader';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { getEntitlementsForTier } from '@/lib/services/entitlementEngine';
import { PlanTier, CustomBrandingSettings } from '@/types';
import { mockStorage } from '@/lib/services/mockStorage';

const DEFAULT_BRANDING: CustomBrandingSettings = {
  organizationId: 'org_demo_1',
  primaryColor: '#003441',
  accentColor: '#00897B',
  businessName: '',
  tagline: '',
  customDomain: '',
  invoiceFooter: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function BrandingSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [planTier, setPlanTier] = useState<PlanTier>('FREE');
  const [branding, setBranding] = useState<CustomBrandingSettings>(DEFAULT_BRANDING);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const session = authService.getSession();
    if (!session || session.role === 'RIDER') {
      router.replace('/login');
      return;
    }

    const org = mockStorage.getState().organization;
    const tier = org?.planTier || 'FREE';
    setPlanTier(tier);

    // Load saved branding
    const stored = localStorage.getItem('veylo_branding');
    if (stored) {
      const parsed = JSON.parse(stored);
      setBranding(parsed);
      if (parsed.logoUrl) setLogoPreview(parsed.logoUrl);
    } else {
      setBranding(prev => ({
        ...prev,
        businessName: org?.businessName || '',
      }));
    }
  }, [router]);

  if (!mounted) return null;

  const entitlements = getEntitlementsForTier(planTier);
  const canCustomize = entitlements.allowCustomBranding;

  if (!canCustomize) {
    return (
      <div className="space-y-6 px-4 sm:px-6">
        <PageHeader
          title="Custom Branding"
          subtitle="Personalize your portal with your brand identity"
          icon="palette"
          backHref="/settings"
        />
        <UpgradePrompt
          feature="Custom Branding"
          currentTier={planTier}
          requiredTier="PRO"
        />
      </div>
    );
  }

  const handleSave = () => {
    const updated = { ...branding, updatedAt: new Date().toISOString() };
    setBranding(updated);
    localStorage.setItem('veylo_branding', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setBranding(prev => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const PRESET_COLORS = [
    { name: 'Veylo Teal', primary: '#003441', accent: '#00897B' },
    { name: 'Ocean Blue', primary: '#1565C0', accent: '#42A5F5' },
    { name: 'Royal Purple', primary: '#4A148C', accent: '#7C4DFF' },
    { name: 'Forest Green', primary: '#1B5E20', accent: '#66BB6A' },
    { name: 'Sunset Orange', primary: '#E65100', accent: '#FF9800' },
    { name: 'Slate Dark', primary: '#263238', accent: '#546E7A' },
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6">
      <PageHeader
        title="Custom Branding"
        subtitle="Personalize your portal with your brand identity"
        icon="palette"
        backHref="/settings"
      />

      {/* Logo */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-on-surface flex items-center gap-2 text-sm sm:text-base">
          <span className="material-symbols-outlined text-primary text-lg">image</span>
          Logo
        </h2>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-outline-variant flex items-center justify-center bg-surface-container-low overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="material-symbols-outlined text-2xl text-on-surface-variant">add_photo_alternate</span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-xs text-on-surface-variant">
              Upload your business logo. Recommended: 200x200px, PNG or SVG, under 2MB.
            </p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-primary font-bold text-xs cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-sm">upload</span>
              Choose Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            {logoPreview && (
              <button
                onClick={() => { setLogoPreview(null); setBranding(prev => ({ ...prev, logoUrl: undefined })); }}
                className="text-xs text-error font-semibold hover:underline"
              >
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-on-surface flex items-center gap-2 text-sm sm:text-base">
          <span className="material-symbols-outlined text-primary text-lg">palette</span>
          Brand Colors
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={e => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer"
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={e => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accentColor}
                onChange={e => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer"
              />
              <input
                type="text"
                value={branding.accentColor}
                onChange={e => setBranding(prev => ({ ...prev, accentColor: e.target.value }))}
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-2">Presets</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(preset => (
              <button
                key={preset.name}
                onClick={() => setBranding(prev => ({ ...prev, primaryColor: preset.primary, accentColor: preset.accent }))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors text-xs"
              >
                <div className="flex gap-0.5">
                  <div className="w-4 h-4 rounded-full" style={{ background: preset.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ background: preset.accent }} />
                </div>
                <span className="font-semibold text-on-surface">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low">
          <p className="text-[10px] text-on-surface-variant mb-2 uppercase font-bold">Preview</p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: branding.primaryColor }}
            >
              {branding.businessName?.charAt(0) || 'V'}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: branding.primaryColor }}>
                {branding.businessName || 'Your Business'}
              </p>
              <p className="text-xs" style={{ color: branding.accentColor }}>
                {branding.tagline || 'Your tagline here'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-on-surface flex items-center gap-2 text-sm sm:text-base">
          <span className="material-symbols-outlined text-primary text-lg">business</span>
          Business Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Business Name</label>
            <input
              type="text"
              value={branding.businessName}
              onChange={e => setBranding(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Your Business Name"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Tagline</label>
            <input
              type="text"
              value={branding.tagline || ''}
              onChange={e => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="Move. Track. Pay."
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5">Custom Domain (coming soon)</label>
          <input
            type="text"
            value={branding.customDomain || ''}
            onChange={e => setBranding(prev => ({ ...prev, customDomain: e.target.value }))}
            placeholder="fleet.yourbusiness.com"
            disabled
            className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface-variant text-sm cursor-not-allowed"
          />
          <p className="text-[10px] text-on-surface-variant mt-1">Custom domain mapping coming in a future update.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5">Invoice Footer Text</label>
          <textarea
            value={branding.invoiceFooter || ''}
            onChange={e => setBranding(prev => ({ ...prev, invoiceFooter: e.target.value }))}
            placeholder="Thank you for your business! Powered by Veylo."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          Save Branding
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-success-container text-on-success-container text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Branding saved successfully!
        </div>
      )}
    </div>
  );
}
