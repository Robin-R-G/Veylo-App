'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { rentalTripService } from '@/lib/services/rentalTripService';
import { Vehicle } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { KOZHIKODE_SAMPLE_ROUTE } from '@/lib/services/gpsTrackingEngine';

export default function RiderStartVehiclePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [riderName, setRiderName] = useState('Robin');
  const [riderPhone, setRiderPhone] = useState('+91 94000 11223');
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const v = mockStorage.getVehicleById(resolvedParams.token);
    if (v) {
      setVehicle(v);
    }
  }, [resolvedParams.token]);

  if (!mounted) return null;

  if (!vehicle) {
    return (
      <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-outline-variant text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-2xl">error</span>
        </div>
        <h2 className="text-lg font-bold text-on-surface">Vehicle Not Found</h2>
        <p className="text-xs text-on-surface-variant">We couldn't find a registered vehicle matching this token.</p>
        <Link href="/rider" className="inline-block px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold">
          Back to Search
        </Link>
      </div>
    );
  }

  if (vehicle.status !== 'AVAILABLE') {
    return (
      <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-outline-variant text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-2xl">lock</span>
        </div>
        <h2 className="text-lg font-bold text-on-surface">Vehicle Unavailable</h2>
        <p className="text-xs text-on-surface-variant">
          Vehicle <span className="font-mono font-bold">{vehicle.registrationNumber}</span> is currently <strong>{vehicle.status}</strong> and cannot be rented right now.
        </p>
        <Link href="/rider" className="inline-block px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold">
          Search Another Vehicle
        </Link>
      </div>
    );
  }

  const handleStartRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsStarting(true);

    if (!riderName.trim()) {
      setErrorMsg('Please enter rider name.');
      setIsStarting(false);
      return;
    }

    let startCoords = { lat: KOZHIKODE_SAMPLE_ROUTE[0].lat, lng: KOZHIKODE_SAMPLE_ROUTE[0].lng };

    // Request HTML5 Geolocation
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        startCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationGranted(true);
      } catch {
        // Fallback to sample regional coordinates if denied/desktop browser
        setLocationGranted(false);
      }
    }

    try {
      const trip = rentalTripService.startTrip({
        vehicleId: vehicle.id,
        riderName,
        riderPhone,
        startCoordinates: startCoords,
      });

      router.push(`/rider/trip/${trip.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start trip.');
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      <PageHeader
        title="Vehicle Verification"
        subtitle="Confirm vehicle details before starting automatic GPS tracking"
        backHref="/rider"
        icon="verified"
      />

      {/* Vehicle Identity Card matching Prompt #3 */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-5">
        
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
              Vehicle Found
            </span>
            <h2 className="text-xl font-extrabold text-on-surface mt-0.5">{vehicle.make} {vehicle.model}</h2>
            <span className="font-mono font-extrabold text-sm tracking-wider px-2.5 py-0.5 rounded bg-surface-container-low border border-outline-variant text-primary inline-block mt-2">
              {vehicle.registrationNumber}
            </span>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              {vehicle.status}
            </span>
            <span className="text-xs text-on-surface-variant block mt-1">{vehicle.city || 'Kozhikode'}</span>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Last Recorded KM</span>
            <span className="font-bold text-base text-on-surface mt-0.5 block">{vehicle.currentOdometer.toLocaleString()} km</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Rental Rate</span>
            <span className="font-bold text-base text-primary mt-0.5 block">₹{vehicle.ratePerKmRupees || 12} / km</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs">
            {errorMsg}
          </div>
        )}

        {/* Rider Form */}
        <form onSubmit={handleStartRide} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Rider Full Name</label>
            <input
              type="text"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Rider Phone Number</label>
            <input
              type="tel"
              value={riderPhone}
              onChange={(e) => setRiderPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Privacy & Location Permission Notice matching Prompt #5 & #22 */}
          <div className="p-3.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-sm text-primary">location_on</span>
              <span>GPS Permission Required</span>
            </div>
            <p className="text-[11px] leading-relaxed text-on-surface-variant">
              Location access is used only to automatically calculate the distance travelled during your rental.
            </p>
          </div>

          <button
            type="submit"
            disabled={isStarting}
            className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            <span>{isStarting ? 'Initiating GPS Tracking...' : 'Start Ride'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
