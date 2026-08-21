'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getVehicleById, findVehicleByRegNumber } from '@/lib/services/supabase/data';
import { rentalTripService } from '@/lib/services/rentalTripService';
import { Vehicle } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { KOZHIKODE_SAMPLE_ROUTE } from '@/lib/services/gpsTrackingEngine';

export default function RiderStartVehicleClient({ token }: { token: string }) {
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const v = await getVehicleById(token) || await findVehicleByRegNumber(token);
        if (v) setVehicle(v);
      } catch {
        // Data will be empty
      }
    }
    load();
  }, [token]);

  if (!mounted || !vehicle) {
    return (
      <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-outline-variant text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-error">error</span>
        <h2 className="text-lg font-bold text-on-surface">Vehicle Not Found</h2>
        <p className="text-xs text-on-surface-variant">The scanned vehicle tag or ID does not exist in the fleet registry.</p>
        <Link href="/rider" className="inline-block px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-xs">
          Return to Rider Search
        </Link>
      </div>
    );
  }

  const isAvailable = vehicle.status === 'AVAILABLE';

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!riderName.trim() || !riderPhone.trim()) {
      setErrorMsg('Please enter your full name and phone number.');
      return;
    }

    if (!isAvailable) {
      setErrorMsg(`This vehicle is currently ${vehicle.status} and cannot be rented.`);
      return;
    }

    setIsStarting(true);

    try {
      let initialLat = KOZHIKODE_SAMPLE_ROUTE[0].lat;
      let initialLng = KOZHIKODE_SAMPLE_ROUTE[0].lng;

      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          initialLat = pos.coords.latitude;
          initialLng = pos.coords.longitude;
          setLocationGranted(true);
        } catch {
          setLocationGranted(false);
        }
      }

      const trip = await rentalTripService.startTrip({
        vehicleId: vehicle.id,
        riderName,
        riderPhone,
        startCoordinates: { lat: initialLat, lng: initialLng },
      });

      router.push(`/rider/trip/${trip.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start trip.');
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Contextual Header */}
      <PageHeader
        title="Vehicle Verification"
        subtitle="Confirm vehicle details and rental terms before starting your journey"
        backHref="/rider"
        icon="verified"
      />

      {/* Vehicle Verification Card matching Prompt #8 */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-5">
        
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant">Selected Fleet Vehicle</span>
            <h2 className="text-xl font-extrabold text-on-surface">{vehicle.make} {vehicle.model}</h2>
            <span className="font-mono font-bold text-sm text-primary tracking-wider px-2.5 py-0.5 rounded bg-surface-container-low border border-outline-variant inline-block mt-1">
              {vehicle.registrationNumber}
            </span>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {vehicle.status}
          </span>
        </div>

        {/* Vehicle Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Last Recorded KM</span>
            <span className="font-extrabold text-lg text-on-surface font-mono mt-0.5 block">
              {vehicle.currentOdometer.toLocaleString()} km
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Rental Rate</span>
            <span className="font-extrabold text-lg text-emerald-800 mt-0.5 block">
              ₹{vehicle.ratePerKmRupees || 12} / km
            </span>
          </div>
        </div>

        {/* Location & GPS Permission Notice */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs">
            <span className="material-symbols-outlined text-sm">my_location</span>
            <span>GPS Tracking Enabled</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Your smartphone's GPS will automatically calculate the exact distance travelled while riding. At the end of the trip, you will pay the owner instantly via UPI.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Rider Identification Form */}
        <form onSubmit={handleStartTrip} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Rider Full Name *</label>
            <input
              type="text"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Robin R G"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Rider Phone Number *</label>
            <input
              type="tel"
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="e.g. +91 94000 11223"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!isAvailable || isStarting}
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all ${
              isAvailable
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">play_circle</span>
            <span>{isStarting ? 'Initiating GPS Session...' : 'Start Ride'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
