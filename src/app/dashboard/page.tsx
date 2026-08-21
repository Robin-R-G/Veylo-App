'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { getVehicles, getRentalTrips, getInvoices, getPayments, getOrganization } from '@/lib/services/supabase/data';
import { Vehicle, Invoice, PlanTier, FuelPrice, RentalTrip, PaymentAttempt, Organization } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { centralFuelPriceService, fuelRealtimeService } from '@/lib/services/fuelPriceService';
import { appRealtimeService } from '@/lib/services/appRealtimeService';
import { geolocationService } from '@/lib/services/geolocationService';
import { AdSlot } from '@/components/ads/AdSlot';
import { PageHeader } from '@/components/ui/PageHeader';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer } from '@/components/animations/StaggerContainer';
import { StaggerItem } from '@/components/animations/StaggerItem';

type TabKey = 'fleet' | 'invoices' | 'payments';

export default function OwnerDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rentalTrips, setRentalTrips] = useState<RentalTrip[]>([]);
  const [petrolPrice, setPetrolPrice] = useState<FuelPrice | null>(null);
  const [dieselPrice, setDieselPrice] = useState<FuelPrice | null>(null);
  const [cngPrice, setCngPrice] = useState<FuelPrice | null>(null);
  const [selectedFuelTab, setSelectedFuelTab] = useState<'PETROL' | 'DIESEL' | 'CNG'>('PETROL');
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>([]);
  const [tier, setTier] = useState<PlanTier>('FREE');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('fleet');

  const loadFuelRates = async () => {
    setIsRefreshing(true);
    try {
      const { city, state } = await geolocationService.getCityState();
      const { petrol, diesel, cng } = await centralFuelPriceService.getAllCurrentRates(state, city);
      setPetrolPrice(petrol);
      setDieselPrice(diesel);
      setCngPrice(cng);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    const loadData = async () => {
      try {
        const orgId = (await supabaseAuth.getOrganizationId()) || 'org_demo_1';

        const [v, t, inv, pay, org] = await Promise.all([
          getVehicles(orgId).catch(() => []),
          getRentalTrips(orgId).catch(() => []),
          getInvoices(orgId).catch(() => []),
          getPayments(orgId).catch(() => []),
          getOrganization(orgId).catch(() => null),
        ]);

        setVehicles(v || []);
        setRentalTrips(t || []);
        setInvoices(inv || []);
        setPaymentAttempts(pay || []);
        setOrganization(org);
        if (org) setTier(org.planTier);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    loadFuelRates();

    const unsubscribeFuel = fuelRealtimeService.subscribe((updated) => {
      if (updated.fuelType === 'PETROL') setPetrolPrice(updated);
      if (updated.fuelType === 'DIESEL') setDieselPrice(updated);
      if (updated.fuelType === 'CNG') setCngPrice(updated);
    });

    const unsubscribeData = appRealtimeService.subscribe(
      [{ table: 'vehicles' }, { table: 'rental_trips' }, { table: 'invoices' }],
      () => { loadData(); }
    );

    return () => { unsubscribeFuel(); unsubscribeData(); };
  }, []);

  if (!mounted || isLoading) return <DashboardSkeleton />;

  const activeRentals = rentalTrips.filter(t => t.status === 'ACTIVE' || t.status === 'CONFIRMATION_PENDING');
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = new Date().toISOString().slice(0, 7);

  const todayPaid = invoices.filter(i => i.paymentStatus === 'PAID' && i.issuedAt?.startsWith(todayStr));
  const monthPaid = invoices.filter(i => i.paymentStatus === 'PAID' && i.issuedAt?.startsWith(monthStr));
  const pendingInvoices = invoices.filter(i => i.paymentStatus === 'PENDING' || i.paymentStatus === 'PAYMENT_INITIATED' || i.paymentStatus === 'PAYMENT_SUBMITTED');
  const completedInvoices = invoices.filter(i => i.paymentStatus === 'PAID');

  const todayEarningsRupees = todayPaid.reduce((sum, i) => sum + i.totalRupees, 0);
  const thisMonthEarningsRupees = monthPaid.reduce((sum, i) => sum + i.totalRupees, 0);
  const pendingEarningsRupees = pendingInvoices.reduce((sum, i) => sum + i.totalRupees, 0);
  const completedEarningsRupees = completedInvoices.reduce((sum, i) => sum + i.totalRupees, 0);
  const totalDistanceKm = rentalTrips.reduce((sum, t) => sum + t.gpsDistanceKm, 0);

  const upiIdDisplay = organization?.upiId || 'Not Configured';

  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: 'fleet', label: 'Fleet', icon: 'directions_car', count: vehicles.length },
    { key: 'invoices', label: 'Invoices', icon: 'receipt_long', count: invoices.length },
    { key: 'payments', label: 'Payments', icon: 'payments', count: paymentAttempts.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Fleet earnings & ride activity at a glance"
        icon="dashboard"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/rider"
              className="px-3 py-2 rounded-lg bg-success text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">directions_bike</span>
              Rider Mode
            </Link>
            <Link
              href="/settings/payment"
              className="px-3 py-2 rounded-lg bg-surface border border-outline-variant text-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              UPI Settings
            </Link>
          </div>
        }
      />

      {activeRentals.length > 0 && (
        <FadeIn direction="down">
          <div className="p-4 rounded-xl bg-warning-container border border-warning text-xs text-on-warning-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-warning animate-bounce">warning</span>
              <div>
                <p className="font-bold">Active Ride In Progress</p>
                <p className="font-medium mt-0.5">
                  Rider {activeRentals[0].riderName} is using vehicle {activeRentals[0].vehicleRegNumber}.
                </p>
              </div>
            </div>
            <Link
              href={`/rider/trip/${activeRentals[0].id}`}
              className="px-4 py-2 rounded-xl bg-white text-primary font-bold text-center shadow hover:bg-slate-100 transition-all"
            >
              Monitor →
            </Link>
          </div>
        </FadeIn>
      )}

      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaggerItem>
          <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Today</span>
            <span className="font-extrabold text-xl sm:text-2xl text-success mt-1 block">{formatCurrency(todayEarningsRupees)}</span>
            <span className="text-[10px] text-success font-bold">UPI settled</span>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">This Month</span>
            <span className="font-extrabold text-xl sm:text-2xl text-primary mt-1 block">{formatCurrency(thisMonthEarningsRupees)}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">Fleet revenue</span>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Pending</span>
            <span className="font-extrabold text-xl sm:text-2xl text-warning mt-1 block">{formatCurrency(pendingEarningsRupees)}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">Awaiting verification</span>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Fleet</span>
            <span className="font-extrabold text-xl sm:text-2xl text-on-surface mt-1 block">{vehicles.length} <span className="text-sm font-normal text-on-surface-variant">vehicles</span></span>
            <span className="text-[10px] text-on-surface-variant font-medium">{totalDistanceKm.toLocaleString()} km total</span>
          </div>
        </StaggerItem>
      </StaggerContainer>

      <FadeIn direction="up" delay={0.1}>
        <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-primary">{selectedFuelTab}</span>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Live"></span>
            </div>
            <div className="flex items-center gap-1">
              {(['PETROL', 'DIESEL', 'CNG'] as const).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSelectedFuelTab(ft)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    selectedFuelTab === ft
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>
          {(() => {
            const activeFp = selectedFuelTab === 'PETROL' ? petrolPrice : selectedFuelTab === 'DIESEL' ? dieselPrice : cngPrice;
            return activeFp && activeFp.priceRupees > 0 ? (
              <div className="text-right">
                <span className="font-extrabold text-lg text-primary">₹{activeFp.priceRupees.toFixed(2)}</span>
                <span className="text-xs text-on-surface-variant ml-1">/ {activeFp.unit || 'L'}</span>
                <span className="text-[10px] text-on-surface-variant block">{activeFp.city}, {activeFp.state}</span>
              </div>
            ) : (
              <span className="text-xs text-error font-semibold">Price unavailable</span>
            );
          })()}
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={0.15}>
        <div className="border-b border-outline-variant flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </FadeIn>

      {activeTab === 'fleet' && (
        <FadeIn direction="up" delay={0.05}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-on-surface">Registered Fleet</h2>
              <Link href="/vehicles" className="text-xs text-primary font-semibold hover:underline">Manage →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vehicles.map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-surface border border-outline-variant shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm tracking-wider text-on-surface font-mono">
                        {v.registrationNumber}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        v.status === 'AVAILABLE' ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-on-surface mt-1">{v.make} {v.model}</h3>
                    <p className="text-[11px] text-on-surface-variant">₹{v.ratePerKmRupees || 12}/km • {v.city || 'Kozhikode'}</p>
                  </div>
                  <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-[11px]">
                    <Link href={`/rider/start/${v.securePublicId}`} className="text-primary hover:underline font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">directions_bike</span>
                      Start Ride
                    </Link>
                    <Link href={`/vehicles/${v.id}`} className="text-primary hover:underline font-semibold">Details →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {activeTab === 'invoices' && (
        <FadeIn direction="up" delay={0.05}>
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface">Recent Invoices</h2>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-xs text-on-surface-variant space-y-1">
                <span className="material-symbols-outlined text-outline text-3xl">receipt_long</span>
                <p className="font-semibold">No invoices yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-3 rounded-lg bg-surface border border-outline-variant flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-on-surface">{inv.invoiceNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.paymentStatus === 'PAID' ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{inv.vehicleRegNumber} • {inv.distanceKm} km</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-xs text-on-surface block">{formatCurrency(inv.totalRupees)}</span>
                      <Link href={`/invoices/${inv.id}`} className="text-[11px] text-primary hover:underline font-semibold">
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {activeTab === 'payments' && (
        <FadeIn direction="up" delay={0.05}>
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-on-surface">UPI Payment History</h2>
            {paymentAttempts.length === 0 ? (
              <div className="text-center py-8 text-xs text-on-surface-variant space-y-1">
                <span className="material-symbols-outlined text-outline text-3xl">payments</span>
                <p className="font-semibold">No payment attempts yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Rider</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAttempts.map((pa) => {
                      const date = new Date(pa.createdAt);
                      return (
                        <tr key={pa.paymentId} className="border-b border-outline-variant hover:bg-surface-container-low transition-all">
                          <td className="py-2 px-3 text-on-surface-variant">
                            {date.getDate()} {date.toLocaleString('en-US', { month: 'short' })}
                          </td>
                          <td className="py-2 px-3 font-bold text-on-surface">
                            {pa.riderId.substring(6, 12).toUpperCase()}
                          </td>
                          <td className="py-2 px-3 font-extrabold text-primary">
                            ₹{pa.amount.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-high border border-outline-variant text-[10px] uppercase font-bold">
                              {pa.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                              pa.status === 'PAID'
                                ? 'bg-success-container text-on-success-container border-success/30'
                                : pa.status === 'PAYMENT_PROCESSING' || pa.status === 'PAYMENT_INITIATED'
                                ? 'bg-warning-container text-on-warning-container border-warning/30'
                                : 'bg-error-container text-on-error-container border-error/30'
                            }`}>
                              {pa.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      <AdSlot placement="dashboard-bottom" />
    </div>
  );
}
