'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getActiveRentalTrips, findVehicleByRegNumber } from '@/lib/services/supabase/data';
import { Vehicle, RentalTrip } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

interface VehicleWithDistance extends Vehicle {
  distanceKm?: number;
  _lat?: number;
  _lng?: number;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Kozhikode': { lat: 11.2588, lng: 75.7804 },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'Kochi': { lat: 9.9312, lng: 76.2673 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Mumbai': { lat: 19.076, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Hyderabad': { lat: 17.385, lng: 78.4867 },
};

function getVehicleCoords(v: Vehicle): { lat: number; lng: number } | null {
  if (v.city && CITY_COORDS[v.city]) {
    const base = CITY_COORDS[v.city];
    const hash = v.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      lat: base.lat + (hash % 10 - 5) * 0.005,
      lng: base.lng + ((hash * 7) % 10 - 5) * 0.005,
    };
  }
  return null;
}

function getDistanceFromLatLon(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RiderPortalPage() {
  const router = useRouter();
  const [vehicleReg, setVehicleReg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTrips, setActiveTrips] = useState<RentalTrip[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleWithDistance[]>([]);
  const [mounted, setMounted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setMounted(true);

    // PWA install prompt
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    async function load() {
      try {
        const supabase = createClient();
        const [trips, { data: vData }] = await Promise.all([
          getActiveRentalTrips().catch(() => []),
          supabase.from('vehicles').select('*').eq('status', 'AVAILABLE'),
        ]);
        const vehList = (vData as Vehicle[]) || [];
        setAvailableVehicles(vehList);
        setActiveTrips(trips || []);
      } catch {
        // Data will be empty
      }
    }
    load();

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('granted');

        // Sort vehicles by distance
        setAvailableVehicles(prev =>
          prev.map(v => {
            const coords = getVehicleCoords(v);
            return {
              ...v,
              _lat: coords?.lat,
              _lng: coords?.lng,
              distanceKm: coords
                ? getDistanceFromLatLon(loc.lat, loc.lng, coords.lat, coords.lng)
                : undefined,
            };
          }).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
        );
      },
      () => { setLocationStatus('denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  const handleFindVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!vehicleReg.trim()) {
      setErrorMsg('Please enter a vehicle registration number.');
      return;
    }
    const found = await findVehicleByRegNumber(vehicleReg);
    if (!found) {
      setErrorMsg(`Vehicle "${vehicleReg.toUpperCase()}" not found.`);
      return;
    }
    if (found.status !== 'AVAILABLE') {
      setErrorMsg(`Vehicle ${found.registrationNumber} is currently ${found.status}.`);
      return;
    }
    router.push(`/rider/start/${found.securePublicId}`);
  };

  if (!mounted) return (
    <div className="max-w-xl mx-auto space-y-6">
      <Skeleton className="h-7 w-48" />
      <div className="bg-surface rounded-2xl p-6 border border-outline-variant space-y-4">
        <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        title="Rider Portal"
        subtitle="Scan QR, find nearby vehicles & start riding"
        icon="two_wheeler"
        backHref="/"
      />

      {/* PWA Install Banner */}
      {installPrompt && !isInstalled && (
        <div className="p-4 rounded-xl bg-primary-container text-on-primary-container shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">install_mobile</span>
            <div>
              <p className="font-bold text-sm">Install Veylo App</p>
              <p className="text-[11px] opacity-80">Add to home screen for faster access</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="px-4 py-2 rounded-lg bg-white text-primary font-bold text-xs shadow hover:bg-surface-container-high transition-all"
          >
            Install
          </button>
        </div>
      )}

      {/* Active Trip Banner */}
      {activeTrips.length > 0 && (
        <div className="p-4 rounded-xl bg-success text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <div>
              <p className="font-bold text-sm">Ride In Progress</p>
              <p className="text-[11px] opacity-90">
                {activeTrips[0].vehicleRegNumber} • {activeTrips[0].gpsDistanceKm} km
              </p>
            </div>
          </div>
          <Link
            href={`/rider/trip/${activeTrips[0].id}`}
            className="px-4 py-2 rounded-lg bg-white text-success font-bold text-xs shadow"
          >
            Open Ride →
          </Link>
        </div>
      )}

      {/* Location Permission */}
      {locationStatus === 'idle' && (
        <button
          onClick={requestLocation}
          className="w-full p-4 rounded-xl bg-surface border border-outline-variant shadow-sm flex items-center gap-4 hover:bg-surface-container-low transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-primary">my_location</span>
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm text-on-surface">Find Nearby Vehicles</p>
            <p className="text-[11px] text-on-surface-variant">Allow location access to see vehicles closest to you</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </button>
      )}

      {locationStatus === 'loading' && (
        <div className="p-4 rounded-xl bg-surface border border-outline-variant shadow-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-primary animate-spin">location_searching</span>
          <span className="text-xs text-on-surface-variant font-semibold">Getting your location...</span>
        </div>
      )}

      {locationStatus === 'denied' && (
        <div className="p-3 rounded-lg bg-warning-container border border-warning text-xs text-on-warning-container flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">info</span>
          Location access denied. You can still search by vehicle number.
        </div>
      )}

      {/* QR Scan Button */}
      <Link
        href="/scan"
        className="w-full p-4 rounded-xl bg-primary text-on-primary shadow-md flex items-center gap-4 hover:bg-primary/90 transition-all"
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Scan Vehicle QR Code</p>
          <p className="text-[11px] opacity-80">Point camera at the QR sticker on the vehicle</p>
        </div>
        <span className="material-symbols-outlined">arrow_forward</span>
      </Link>

      {/* Search by Number */}
      <div className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">search</span>
          Search by Vehicle Number
        </h3>
        {errorMsg && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleFindVehicle} className="flex gap-2">
          <input
            type="text"
            placeholder="KL 16 P 78"
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-primary uppercase placeholder:normal-case placeholder:font-normal"
            required
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase shadow hover:bg-primary/90 transition-all"
          >
            Go
          </button>
        </form>
      </div>

      {/* Nearest Vehicles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">directions_car</span>
            {userLocation ? 'Nearest Vehicles' : 'Available Vehicles'}
          </h3>
          {userLocation && (
            <span className="text-[10px] text-on-surface-variant font-mono">
              Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {availableVehicles.length === 0 ? (
            <div className="p-6 rounded-xl bg-surface border border-outline-variant text-center text-xs text-on-surface-variant">
              No vehicles available right now.
            </div>
          ) : (
            availableVehicles.map((v) => (
              <Link
                key={v.id}
                href={`/rider/start/${v.securePublicId}`}
                className="p-4 rounded-xl bg-surface border border-outline-variant hover:border-primary transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">two_wheeler</span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-sm text-on-surface block group-hover:text-primary">
                      {v.registrationNumber}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {v.make} {v.model} • ₹{v.ratePerKmRupees || 12}/km
                    </span>
                    {v.distanceKm !== undefined && (
                      <span className="text-[10px] text-primary font-bold block mt-0.5">
                        {v.distanceKm < 1 ? `${Math.round(v.distanceKm * 1000)}m away` : `${v.distanceKm.toFixed(1)} km away`}
                      </span>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
