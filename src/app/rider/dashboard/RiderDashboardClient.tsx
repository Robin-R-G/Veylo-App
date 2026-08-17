'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/authService';
import { createClient } from '@/lib/supabase/client';
import { getTripsByRider } from '@/lib/services/supabase/data';
import { RentalTrip, Invoice, AppSession, FuelPrice } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { centralFuelPriceService, fuelRealtimeService } from '@/lib/services/fuelPriceService';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function RiderDashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const [myTrips, setMyTrips] = useState<RentalTrip[]>([]);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [fuelPrices, setFuelPrices] = useState<{ petrol?: FuelPrice; diesel?: FuelPrice; cng?: FuelPrice }>({});
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'trips' | 'invoices'>('trips');

  useEffect(() => {
    setMounted(true);
    const s = authService.getSession();
    if (!s || s.role !== 'RIDER') {
      router.replace('/rider');
      return;
    }
    setSession(s);

    async function load() {
      try {
        const [trips, rates] = await Promise.all([
          getTripsByRider(s!.userId).catch(() => []),
          centralFuelPriceService.getAllCurrentRates('Kerala', 'Kozhikode').catch(() => ({ petrol: undefined, diesel: undefined, cng: undefined })),
        ]);
        setMyTrips(trips || []);
        setFuelPrices(rates || {});

        const supabase = createClient();
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_name', s!.name);
        setMyInvoices((invData as Invoice[]) || []);
      } catch {
        setMyTrips([]);
        setMyInvoices([]);
      }
    }
    load();

    const unsubscribe = fuelRealtimeService.subscribe((updated) => {
      setFuelPrices(prev => ({
        ...prev,
        [updated.fuelType.toLowerCase()]: updated,
      }));
    });

    return () => unsubscribe();
  }, [router]);

  if (!mounted || !session) return <DashboardSkeleton />;

  const activeTrip = myTrips.find(t => t.status === 'ACTIVE' || t.status === 'CONFIRMATION_PENDING');
  const completedTrips = myTrips.filter(t => t.status === 'COMPLETED');
  const totalDistanceKm = completedTrips.reduce((sum, t) => sum + t.gpsDistanceKm, 0);
  const totalSpentRupees = myInvoices.filter(i => i.paymentStatus === 'PAID').reduce((sum, i) => sum + i.totalRupees, 0);

  const handleLogout = async () => {
    await authService.logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Rider Header */}
      <div className="bg-primary text-on-primary px-4 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-on-primary/70 font-medium">RIDER PORTAL</p>
          <h1 className="text-xl font-bold">{session.name}</h1>
          {session.phone && (
            <p className="text-xs text-on-primary/80">{session.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-all"
          >
            <span className="material-symbols-outlined text-sm">settings</span>
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-all"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Exit
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Active Ride Banner */}
        {activeTrip && (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Ride in Progress</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-on-surface">{activeTrip.vehicleRegNumber}</p>
                <p className="text-xs text-on-surface-variant">{activeTrip.vehicleModel}</p>
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  {activeTrip.gpsDistanceKm.toFixed(2)} km tracked
                </p>
              </div>
              <Link
                href={`/rider/trip/${activeTrip.id}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide shadow-sm hover:bg-emerald-600 transition-all"
              >
                Open Ride →
              </Link>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl p-3 border border-outline-variant text-center shadow-sm">
            <p className="text-2xl font-extrabold text-primary">{completedTrips.length}</p>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase">Trips</p>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-outline-variant text-center shadow-sm">
            <p className="text-2xl font-extrabold text-primary">{totalDistanceKm.toFixed(0)}</p>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase">km Ridden</p>
          </div>
          <div className="bg-surface rounded-xl p-3 border border-outline-variant text-center shadow-sm">
            <p className="text-xl font-extrabold text-primary">₹{totalSpentRupees.toFixed(0)}</p>
            <p className="text-[10px] text-on-surface-variant font-medium uppercase">Spent</p>
          </div>
        </div>

        {/* Start New Ride CTA */}
        {!activeTrip && (
          <Link
            href="/rider"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wide shadow hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined">directions_bike</span>
            Start a New Ride
          </Link>
        )}

        {/* Central Fuel Benchmark Rates */}
        <div className="bg-surface rounded-2xl p-4 border border-outline-variant shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary text-sm">local_gas_station</span>
              <span>Official Fuel Rates (Kerala)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Central Sync
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/60">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase">Petrol</p>
              <p className="text-sm font-extrabold text-primary">₹{fuelPrices.petrol?.priceRupees.toFixed(2) || '107.50'}<span className="text-[9px] font-normal text-on-surface-variant">/L</span></p>
            </div>
            <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/60">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase">Diesel</p>
              <p className="text-sm font-extrabold text-primary">₹{fuelPrices.diesel?.priceRupees.toFixed(2) || '96.30'}<span className="text-[9px] font-normal text-on-surface-variant">/L</span></p>
            </div>
            <div className="bg-surface-container-low p-2 rounded-xl border border-outline-variant/60">
              <p className="text-[10px] text-on-surface-variant font-bold uppercase">CNG</p>
              <p className="text-sm font-extrabold text-primary">₹{fuelPrices.cng?.priceRupees.toFixed(2) || '88.00'}<span className="text-[9px] font-normal text-on-surface-variant">/kg</span></p>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant">
          <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'trips' ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant'}`}
          >
            Trip History ({myTrips.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'invoices' ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant'}`}
          >
            Invoices ({myInvoices.length})
          </button>
        </div>

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div className="space-y-3">
            {myTrips.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-outline mb-2 block">two_wheeler</span>
                <p className="font-semibold text-sm">No rides yet</p>
                <p className="text-xs mt-1">Your completed rides will appear here</p>
              </div>
            )}
            {myTrips.map(trip => (
              <div key={trip.id} className="bg-surface rounded-xl border border-outline-variant p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-sm text-on-surface">{trip.vehicleRegNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    trip.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    trip.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {trip.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mb-2">{trip.vehicleModel}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{trip.gpsDistanceKm.toFixed(2)} km</p>
                    <p className="text-[10px] text-on-surface-variant">Distance</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{formatCurrency(trip.totalAmountRupees)}</p>
                    <p className="text-[10px] text-on-surface-variant">Amount</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{formatDuration(trip.durationSeconds)}</p>
                    <p className="text-[10px] text-on-surface-variant">Duration</p>
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2">{formatDate(trip.startTime)}</p>
                {(trip.status === 'ACTIVE' || trip.status === 'CONFIRMATION_PENDING') && (
                  <Link
                    href={`/rider/trip/${trip.id}`}
                    className="mt-3 block text-center py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide hover:bg-primary/20 transition-all"
                  >
                    Continue Ride →
                  </Link>
                )}
                {trip.invoiceId && (
                  <Link
                    href={`/invoices/${trip.invoiceId}`}
                    className="mt-3 block text-center py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold uppercase tracking-wide hover:bg-surface-container-low transition-all"
                  >
                    View Invoice
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {myInvoices.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-outline mb-2 block">receipt_long</span>
                <p className="font-semibold text-sm">No invoices yet</p>
                <p className="text-xs mt-1">Invoices from your rides will appear here</p>
              </div>
            )}
            {myInvoices.map(invoice => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="block bg-surface rounded-xl border border-outline-variant p-4 shadow-sm hover:border-primary transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-on-surface">{invoice.invoiceNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    invoice.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {invoice.paymentStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-on-surface-variant">{invoice.vehicleRegNumber}</p>
                    <p className="text-xs text-on-surface-variant">{formatDate(invoice.issuedAt)}</p>
                  </div>
                  <p className="text-lg font-extrabold text-primary group-hover:scale-105 transition-transform">
                    {formatCurrency(invoice.totalRupees)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
