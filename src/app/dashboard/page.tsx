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

    // Subscribe to realtime central fuel updates
    const unsubscribeFuel = fuelRealtimeService.subscribe((updated) => {
      if (updated.fuelType === 'PETROL') setPetrolPrice(updated);
      if (updated.fuelType === 'DIESEL') setDieselPrice(updated);
      if (updated.fuelType === 'CNG') setCngPrice(updated);
    });

    // Subscribe to realtime vehicle, trip, and invoice changes
    const unsubscribeData = appRealtimeService.subscribe(
      [{ table: 'vehicles' }, { table: 'rental_trips' }, { table: 'invoices' }],
      () => { loadData(); }
    );

    return () => { unsubscribeFuel(); unsubscribeData(); };
  }, []);

  if (!mounted || isLoading) return <DashboardSkeleton />;


  // Active rentals
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

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Fleet & Rental Dashboard"
        subtitle="Real-time vehicle usage, GPS rider trips & earnings tracking"
        icon="dashboard"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/rider"
              className="px-4 py-2.5 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-emerald-800 transition-all"
            >
              <span className="material-symbols-outlined text-sm">directions_bike</span>
              Rider Mode
            </Link>
            <Link
              href="/settings/payment"
              className="px-4 py-2.5 rounded-lg bg-surface border border-outline-variant text-primary font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              Payment Settings
            </Link>
          </div>
        }
      />

      {/* Active Rental Warnings */}
      {activeRentals.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-700 animate-bounce">warning</span>
            <div>
              <p className="font-bold">Active Ride Telemetry Ingestion In Progress</p>
              <p className="text-on-surface-variant font-medium mt-0.5">
                Rider {activeRentals[0].riderName} is currently using vehicle {activeRentals[0].vehicleRegNumber}.
              </p>
            </div>
          </div>
          <Link
            href={`/rider/trip/${activeRentals[0].id}`}
            className="px-4 py-2.5 rounded-xl bg-white text-primary font-bold text-xs text-center shadow hover:bg-slate-100 transition-all"
          >
            Monitor Ride →
          </Link>
        </div>
      )}

      {/* Owner Earnings Summary matching Section 12 */}
      <div className="bg-surface rounded-2xl p-6 border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Owner Payments Summary
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">Auto-settled to: <strong className="font-mono text-primary">{upiIdDisplay}</strong></span>
            <Link href="/owner/payments" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View Payments
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Today's Earnings</span>
            <span className="font-extrabold text-xl sm:text-2xl text-emerald-800 mt-1 block">{formatCurrency(todayEarningsRupees)}</span>
            <span className="text-[10px] text-emerald-700 font-bold">✓ Instant UPI settled</span>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">This Month</span>
            <span className="font-extrabold text-xl sm:text-2xl text-primary mt-1 block">{formatCurrency(thisMonthEarningsRupees)}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">Aug 2026 fleet revenue</span>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Pending</span>
            <span className="font-extrabold text-xl sm:text-2xl text-amber-800 mt-1 block">{formatCurrency(pendingEarningsRupees)}</span>
            <span className="text-[10px] text-on-surface-variant font-medium">Awaiting payment verification</span>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Completed</span>
            <span className="font-extrabold text-xl sm:text-2xl text-emerald-800 mt-1 block">{formatCurrency(completedEarningsRupees)}</span>
            <span className="text-[10px] text-emerald-700 font-bold">Paid direct invoice sums</span>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="bento-grid">
        
        {/* Metric 1: Total Fleet Vehicles */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fleet Vehicles</span>
            <span className="material-symbols-outlined text-primary">directions_car</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-on-surface">{vehicles.length}</p>
          <span className="text-[11px] text-on-surface-variant mt-1">Active registered fleet</span>
        </div>

        {/* Metric 2: Total Recorded Distance */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Usage Distance</span>
            <span className="material-symbols-outlined text-secondary">route</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-on-surface">{totalDistanceKm.toLocaleString()} <span className="text-sm font-normal text-on-surface-variant">km</span></p>
          <span className="text-[11px] text-on-surface-variant mt-1">GPS verified distance</span>
        </div>

        {/* Metric 3: Live Fuel Rate Widget for Kozhikode, Kerala */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {selectedFuelTab} RATE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Real-time central sync active"></span>
            </div>
            <div className="flex items-center gap-1">
              {(['PETROL', 'DIESEL', 'CNG'] as const).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSelectedFuelTab(ft)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    selectedFuelTab === ft
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {ft === 'PETROL' ? 'P' : ft === 'DIESEL' ? 'D' : 'CNG'}
                </button>
              ))}
            </div>
          </div>

          <div>
            {(() => {
              const activeFp = selectedFuelTab === 'PETROL' ? petrolPrice : selectedFuelTab === 'DIESEL' ? dieselPrice : cngPrice;
              return activeFp && activeFp.priceRupees > 0 ? (
                <>
                  <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                    ₹{activeFp.priceRupees.toFixed(2)} <span className="text-sm font-normal text-on-surface-variant">/ {activeFp.unit || 'L'}</span>
                  </p>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    {activeFp.city}, {activeFp.state} • {activeFp.status === 'LIVE' ? '🟢 Live Central Sync' : '🟡 Verified Rate'}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-error">
                  Fuel price temporarily unavailable
                </p>
              );
            })()}
          </div>
        </div>


        {/* Fleet Vehicles Card Grid (Span 8) */}
        <div className="bento-col-8 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">directions_car</span>
              Registered Fleet
            </h2>
            <Link href="/vehicles" className="text-xs text-primary font-semibold hover:underline">
              Manage Fleet →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-base tracking-wider text-on-surface bg-surface border border-outline-variant px-2.5 py-0.5 rounded font-mono">
                      {v.registrationNumber}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      v.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {v.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-on-surface mt-2">{v.make} {v.model}</h3>
                  <p className="text-xs text-on-surface-variant">Rate: <strong className="text-primary font-bold">₹{v.ratePerKmRupees || 12}/km</strong> • {v.city || 'Kozhikode'}</p>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface p-2 rounded border border-outline-variant">
                      <span className="text-on-surface-variant text-[10px] block">Current ODO</span>
                      <span className="font-bold text-on-surface">{v.currentOdometer.toLocaleString()} km</span>
                    </div>
                    <div className="bg-surface p-2 rounded border border-outline-variant">
                      <span className="text-on-surface-variant text-[10px] block">Mileage</span>
                      <span className="font-bold text-primary">{v.mileageKmpl} km/L</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                  <Link href={`/rider/start/${v.securePublicId}`} className="text-primary hover:underline font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">directions_bike</span>
                    Rider Start
                  </Link>
                  <Link href={`/vehicles/${v.id}`} className="text-primary hover:underline font-semibold flex items-center gap-1">
                    Ledger & Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices Table (Span 4) */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Recent Invoices
            </h2>
          </div>

          <div className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-6">No invoices generated yet.</p>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{inv.invoiceNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.paymentStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>{inv.vehicleRegNumber} • {inv.distanceKm} km</span>
                    <span className="font-bold text-on-surface">{formatCurrency(inv.totalRupees)}</span>
                  </div>
                  <div className="pt-1 text-right">
                    <Link href={`/invoices/${inv.id}`} className="text-[11px] text-primary hover:underline font-semibold">
                      View Invoice →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Direct UPI Payment attempts history - Section 12 */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Direct UPI Payment History Ledger
          </h2>
          <span className="text-xs text-on-surface-variant font-medium">
            Total transactions logged: <strong>{paymentAttempts.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          {paymentAttempts.length === 0 ? (
            <div className="text-center py-8 text-xs text-on-surface-variant space-y-1">
              <span className="material-symbols-outlined text-outline text-3xl">payments</span>
              <p className="font-semibold">No direct UPI payment attempts registered yet.</p>
              <p>Simulated payments from riders will display here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Rider</th>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method & Destination</th>
                  <th className="py-3 px-4">Ref/VPA</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentAttempts.map((pa) => {
                  const date = new Date(pa.createdAt);
                  return (
                    <tr key={pa.paymentId} className="border-b border-outline-variant hover:bg-surface-container-low transition-all">
                      <td className="py-3 px-4 font-medium text-on-surface-variant">
                        {date.getDate()} {date.toLocaleString('en-US', { month: 'short' })} {date.getFullYear()}
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface">
                        Rider {pa.riderId.substring(6, 12).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        <Link href={`/invoices/${pa.invoiceId}`} className="hover:underline">
                          {pa.invoiceId.substring(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-primary">
                        ₹{pa.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface-variant">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] uppercase font-bold mr-1.5">
                          {pa.paymentMethod}
                        </span>
                        <span className="font-mono text-[10px]">{pa.paymentDestination}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-on-surface-variant">
                        {pa.providerReference || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                          pa.status === 'PAID' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : pa.status === 'PAYMENT_PROCESSING' || pa.status === 'PAYMENT_INITIATED'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}>
                          {pa.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdSlot placement="dashboard-bottom" />
    </div>
  );
}
