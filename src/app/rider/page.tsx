'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getActiveRentalTrips, findVehicleByRegNumber } from '@/lib/services/supabase/data';
import { Vehicle, RentalTrip } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { mockStorage } from '@/lib/services/mockStorage';

export default function RiderPortalPage() {
  const router = useRouter();
  const [vehicleReg, setVehicleReg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTrips, setActiveTrips] = useState<RentalTrip[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const supabase = createClient();
        const [trips, { data: vData }] = await Promise.all([
          getActiveRentalTrips().catch(() => []),
          supabase.from('vehicles').select('*').eq('status', 'AVAILABLE'),
        ]);
        let vehList = (vData as Vehicle[]) || [];
        if (vehList.length === 0) {
          vehList = mockStorage.getState().vehicles.filter(v => v.status === 'AVAILABLE');
        }
        setAvailableVehicles(vehList);
        setActiveTrips(trips || []);
      } catch {
        setAvailableVehicles(mockStorage.getState().vehicles.filter(v => v.status === 'AVAILABLE'));
      }
    }
    load();
  }, []);

  if (!mounted) return null;

  const handleFindVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehicleReg.trim()) {
      setErrorMsg('Please enter a vehicle registration number.');
      return;
    }

    const found = await findVehicleByRegNumber(vehicleReg);
    if (!found) {
      setErrorMsg(`Vehicle "${vehicleReg.toUpperCase()}" not found. Please verify the registration number.`);
      return;
    }

    if (found.status !== 'AVAILABLE') {
      setErrorMsg(`Vehicle ${found.registrationNumber} is currently ${found.status}. Only AVAILABLE vehicles can be rented.`);
      return;
    }

    router.push(`/rider/start/${found.securePublicId}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      {/* Page Header */}
      <PageHeader
        title="Rider Portal"
        subtitle="Automatic GPS kilometer tracking, live trip calculation & instant UPI billing"
        icon="two_wheeler"
        backHref="/dashboard"
      />

      {/* Active Trip Banner if Rider has an ongoing journey */}
      {activeTrips.length > 0 && (
        <div className="p-4 rounded-xl bg-primary-container text-on-primary-container shadow-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-extrabold text-sm text-white">RIDE IN PROGRESS</span>
            </div>
            <p className="text-xs text-white/90 mt-1">
              Vehicle: <span className="font-mono font-bold">{activeTrips[0].vehicleRegNumber}</span> • {activeTrips[0].gpsDistanceKm} km tracked
            </p>
          </div>

          <Link
            href={`/rider/trip/${activeTrips[0].id}`}
            className="px-4 py-2 rounded-lg bg-white text-primary font-bold text-xs shadow hover:bg-slate-100 transition-all"
          >
            Open Live Ride →
          </Link>
        </div>
      )}

      {/* Main Rider Entry Card */}
      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-outline-variant shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
            <span className="material-symbols-outlined text-3xl">directions_bike</span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface">Start a Ride</h2>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Enter the vehicle registration number or scan the QR code attached to the vehicle.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleFindVehicle} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">
              Vehicle Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. KL 08 AB 1234 or KL 16 P 78"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-extrabold text-lg tracking-wider focus:outline-none focus:border-primary uppercase placeholder:normal-case placeholder:font-normal placeholder:text-sm"
                required
              />
              <span className="absolute right-3.5 top-3.5 material-symbols-outlined text-outline">
                search
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2"
          >
            <span>Find Vehicle & Start Ride</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-outline-variant w-full"></div>
          <span className="bg-surface px-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">OR SCAN VEHICLE QR</span>
          <div className="border-t border-outline-variant w-full"></div>
        </div>

        {/* Quick Fleet Quick-Start Selector for Demo */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
            Available Verified Vehicles:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableVehicles.map((v) => (
              <Link
                key={v.id}
                href={`/rider/start/${v.securePublicId}`}
                className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-mono font-bold text-xs text-on-surface block group-hover:text-primary">
                    {v.registrationNumber}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    {v.make} {v.model} • ₹{v.ratePerKmRupees || 12}/km
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">
                  qr_code_scanner
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
