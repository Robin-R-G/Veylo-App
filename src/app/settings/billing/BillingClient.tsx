'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPlans, getSubscriptionForOrg } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { paymentService } from '@/lib/services/paymentService';
import { authService } from '@/lib/services/authService';
import { SaaSPlan, Subscription } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency } from '@/lib/services/financialEngine';

export default function BillingClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  
  // Simulated payment modal/loading
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadBillingData = async () => {
    const orgId = await supabaseAuth.getOrganizationId();
    if (!orgId) return;
    const sub = await getSubscriptionForOrg(orgId);
    if (sub) {
      setActiveSub(sub);
    }
    setPlans(await getPlans());
  };

  useEffect(() => {
    setMounted(true);
    const session = authService.getSession();
    if (!session || session.role === 'RIDER') {
      router.replace('/login');
      return;
    }
    loadBillingData();
  }, [router]);

  if (!mounted || plans.length === 0 || !activeSub) return null;

  const currentPlan = plans.find(p => p.id === activeSub.planId)!;

  const handleSelectUpgrade = async (planId: string) => {
    if (planId === activeSub.planId) return;

    setSelectedPlanId(planId);
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Simulate standard payment gateway subscription checkout flow
    setTimeout(async () => {
      try {
        const orgId = await supabaseAuth.getOrganizationId();
        
        // Purchase plan using paymentService
        await paymentService.purchaseSubscription({
          organizationId: orgId,
          planId: planId,
          paymentMethod: 'UPI_DIRECT'
        });

        setIsProcessing(false);
        setSuccessMsg(`🎉 Plan successfully upgraded to ${planId}! Your new limits are active.`);
        
        // Reload settings states
        loadBillingData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        setIsProcessing(false);
        setErrorMsg(err.message || 'Upgrade failed. Please try again.');
      }
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Billing & Subscriptions"
        subtitle="Manage your SaaS subscription plan, compare feature tiers, and review business limits"
        icon="credit_card"
        backHref="/settings"
      />

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-300 shadow-sm animate-pulse">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error shadow-sm">
          <span className="material-symbols-outlined text-sm">report_problem</span>
          {errorMsg}
        </div>
      )}

      {/* Subscription Status Card */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Active Subscription</span>
          <h2 className="font-black text-lg text-primary mt-1 flex items-center gap-2">
            {currentPlan.name}
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
              {activeSub.status}
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Billing Interval: <strong>{currentPlan.billingInterval}</strong> • Vehicle Limit: <strong>{currentPlan.vehicleLimit}</strong>
          </p>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-outline-variant pt-4 md:pt-0 md:pl-6 text-xs">
          <span className="text-on-surface-variant block">Next Invoice Renewal:</span>
          <span className="font-extrabold text-on-surface text-sm mt-1 block">
            {new Date(activeSub.currentPeriodEnd).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-[10px] text-on-surface-variant block mt-0.5">Auto-renews at current rate</span>
        </div>
      </div>

      {/* Plan comparison container */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">star_rate</span>
          SaaS Tiers & Gating Limits
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {plans.map(p => {
            const isActive = p.id === activeSub.planId;
            return (
              <div 
                key={p.id} 
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all ${
                  isActive 
                    ? 'bg-primary-container/20 border-primary shadow' 
                    : 'bg-surface border-outline-variant hover:bg-surface-container-low'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-sm text-on-surface uppercase tracking-tight">{p.id}</h4>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-bold text-[9px] uppercase tracking-widest">
                        Active
                      </span>
                    )}
                  </div>
                  <h5 className="font-bold text-xs text-on-surface-variant mt-1">{p.name}</h5>

                  <div className="mt-3.5 pb-3.5 border-b border-outline-variant">
                    <span className="font-extrabold text-xl text-primary font-mono">
                      {p.priceRupees === 0 ? 'Free' : `₹${p.priceRupees}`}
                    </span>
                    {p.priceRupees > 0 && (
                      <span className="text-[10px] text-on-surface-variant font-medium"> / mo</span>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-on-surface-variant">
                    <li className="flex items-center gap-1.5 font-semibold text-on-surface">
                      <span className="material-symbols-outlined text-emerald-600 text-xs font-black">check</span>
                      Max Vehicles: {p.vehicleLimit > 50 ? '50+' : p.vehicleLimit}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-xs font-black">check</span>
                      Staff Seats: {p.staffLimit}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-xs font-black ${p.gpsEnabled ? 'text-emerald-600' : 'text-outline'}`}>
                        {p.gpsEnabled ? 'check' : 'close'}
                      </span>
                      GPS Tracking: {p.id === 'FREE' ? 'Basic' : 'Advanced'}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-xs font-black ${p.advancedReports ? 'text-emerald-600' : 'text-outline'}`}>
                        {p.advancedReports ? 'check' : 'close'}
                      </span>
                      Advanced Reports
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-xs font-black ${p.customBranding ? 'text-emerald-600' : 'text-outline'}`}>
                        {p.customBranding ? 'check' : 'close'}
                      </span>
                      Custom Branding
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-xs font-black ${!p.adsEnabled ? 'text-emerald-600' : 'text-outline'}`}>
                        {!p.adsEnabled ? 'check' : 'close'}
                      </span>
                      Ad-Free Portal
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectUpgrade(p.id)}
                  disabled={isActive || (isProcessing && selectedPlanId === p.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 border ${
                    isActive 
                      ? 'bg-surface-container text-on-surface-variant border-outline-variant cursor-default' 
                      : isProcessing && selectedPlanId === p.id
                      ? 'bg-surface-container text-outline border-outline-variant'
                      : 'bg-primary text-on-primary hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isProcessing && selectedPlanId === p.id && (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  )}
                  <span>
                    {isActive 
                      ? 'Current Plan' 
                      : isProcessing && selectedPlanId === p.id 
                      ? 'Upgrading...' 
                      : p.priceRupees === 0 
                      ? 'Select Free' 
                      : 'Upgrade Plan'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Gating Comparison Grid */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-4 overflow-x-auto">
        <h3 className="font-bold text-sm text-on-surface">Plan Comparison Grid</h3>

        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
              <th className="py-2.5 px-3">Capability</th>
              <th className="py-2.5 px-3 text-center">Free</th>
              <th className="py-2.5 px-3 text-center">Starter</th>
              <th className="py-2.5 px-3 text-center">Pro</th>
              <th className="py-2.5 px-3 text-center">Business</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Registered Vehicles Limit', vals: ['2', '5', '20', '100'] },
              { label: 'GPS Kilometers Telemetry', vals: ['Basic', 'Yes', 'Advanced', 'Advanced'] },
              { label: 'Ad Placements', vals: ['On Dashboard', 'Limited', 'Ad-Free', 'Ad-Free'] },
              { label: 'Custom Invoice Logos', vals: ['Powered by Veylo', 'No', 'Yes', 'Yes'] },
              { label: 'Business staff Accounts', vals: ['No', 'No', '3 Seats', '10 Seats'] },
              { label: 'Multi-Location Filters', vals: ['No', 'No', 'No', 'Yes'] },
              { label: 'Platform White-Labeling', vals: ['No', 'No', 'No', 'Yes'] }
            ].map((row, idx) => (
              <tr key={idx} className="border-b border-outline-variant hover:bg-surface-container-low">
                <td className="py-3 px-3 font-semibold text-on-surface-variant">{row.label}</td>
                {row.vals.map((v, i) => (
                  <td key={i} className="py-3 px-3 text-center text-on-surface font-bold">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
