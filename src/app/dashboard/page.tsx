'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { Vehicle, Ride, Invoice, PlanTier, FuelPrice } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { AdSlot } from '@/components/ads/AdSlot';
import { PageHeader } from '@/components/ui/PageHeader';

export default function OwnerDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fuelPrice, setFuelPrice] = useState<FuelPrice | null>(null);
  const [tier, setTier] = useState<PlanTier>('FREE');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadFuelRate = async (refresh = false) => {
    setIsRefreshing(true);
    try {
      const price = await fuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode', refresh);
      setFuelPrice(price);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const state = mockStorage.getState();
    setVehicles(state.vehicles);
    setRides(state.rides);
    setInvoices(state.invoices);
    setTier(state.currentTier);

    loadFuelRate();
  }, []);

  if (!mounted) return null;

  // Key Metrics Aggregations
  const totalVehicles = vehicles.length;
  const totalDistanceKm = rides.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalFuelCostRupees = rides.reduce((sum, r) => sum + r.estimatedFuelCostPaise / 100, 0);

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Fleet Management Dashboard"
        subtitle="Real-time vehicle usage, odometer activity & Indian API fuel pricing"
        icon="dashboard"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/vehicles/new"
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Vehicle
            </Link>
            <Link
              href="/estimator"
              className="px-4 py-2.5 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-xs flex items-center gap-1.5 hover:bg-surface-container-low transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">calculate</span>
              Trip Estimator
            </Link>
          </div>
        }
      />

      {/* Bento Grid Layout */}
      <div className="bento-grid">
        
        {/* Metric 1: Total Fleet Vehicles */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fleet Vehicles</span>
            <span className="material-symbols-outlined text-primary">directions_car</span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface">{totalVehicles}</p>
          <span className="text-[11px] text-on-surface-variant mt-1">Active registered fleet</span>
        </div>

        {/* Metric 2: Total Recorded Distance */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Usage Distance</span>
            <span className="material-symbols-outlined text-secondary">route</span>
          </div>
          <p className="text-3xl font-extrabold text-on-surface">{totalDistanceKm.toLocaleString()} <span className="text-sm font-normal text-on-surface-variant">km</span></p>
          <span className="text-[11px] text-on-surface-variant mt-1">Total odometer logs</span>
        </div>

        {/* Metric 3: Live Fuel Rate Widget for Kozhikode, Kerala */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Petrol Rate</span>
            <button
              onClick={() => loadFuelRate(true)}
              disabled={isRefreshing}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
              Refresh
            </button>
          </div>

          <div>
            <p className="text-3xl font-extrabold text-primary">
              ₹{(fuelPrice?.priceRupees || 104.20).toFixed(2)} <span className="text-sm font-normal text-on-surface-variant">/ L</span>
            </p>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              Kozhikode, Kerala • {fuelPrice?.status === 'verified' ? 'Updated:' : 'Last verified:'} {fuelPrice ? new Date(fuelPrice.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:30 AM'}
            </p>
          </div>
        </div>

        {/* Fleet Vehicles Card Grid (Span 8) */}
        <div className="bento-col-8 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">directions_car</span>
              Registered Vehicles
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
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary-container text-on-primary-container">
                      {v.vehicleType}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-on-surface mt-2">{v.make} {v.model}</h3>
                  <p className="text-xs text-on-surface-variant">Location: {v.city || 'Kozhikode'}, {v.state || 'Kerala'}</p>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface p-2 rounded border border-outline-variant">
                      <span className="text-on-surface-variant text-[10px] block">Odometer</span>
                      <span className="font-bold text-on-surface">{v.currentOdometer.toLocaleString()} km</span>
                    </div>
                    <div className="bg-surface p-2 rounded border border-outline-variant">
                      <span className="text-on-surface-variant text-[10px] block">Mileage</span>
                      <span className="font-bold text-primary">{v.mileageKmpl} km/L</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                  <Link href={`/v/${v.securePublicId}`} className="text-primary hover:underline font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                    QR Flow
                  </Link>
                  <Link href={`/vehicles/${v.id}`} className="text-primary hover:underline font-semibold flex items-center gap-1">
                    Vehicle Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Table (Span 4) */}
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Recent Usage Bills
            </h2>
          </div>

          <div className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-6">No usage bills generated yet.</p>
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
                      View Usage Bill →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AdSlot placement="dashboard-bottom" />
    </div>
  );
}
