'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { rentalTripService } from '@/lib/services/rentalTripService';
import { RentalTrip } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { KOZHIKODE_SAMPLE_ROUTE } from '@/lib/services/gpsTrackingEngine';

export default function LiveRidePage({ params }: { params: Promise<{ tripId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<RentalTrip | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = mockStorage.getRentalTripById(resolvedParams.tripId);
    if (t) {
      setTrip(t);
      const startMs = new Date(t.startTime).getTime();
      setSecondsElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }
  }, [resolvedParams.tripId]);

  // Live timer interval
  useEffect(() => {
    if (!trip || trip.status !== 'ACTIVE') return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [trip]);

  // Real Geolocation watchPosition
  useEffect(() => {
    if (!trip || trip.status !== 'ACTIVE' || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const updated = rentalTripService.ingestGpsPoint(trip.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: Date.now(),
        });
        setTrip({ ...updated });
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [trip?.id]);

  // Simulation mode step interval
  useEffect(() => {
    if (!isSimulating || !trip || trip.status !== 'ACTIVE') return;

    const simInterval = setInterval(() => {
      setRouteIndex((prevIdx) => {
        const nextIdx = (prevIdx + 1) % KOZHIKODE_SAMPLE_ROUTE.length;
        const waypoint = KOZHIKODE_SAMPLE_ROUTE[nextIdx];

        const updated = rentalTripService.ingestGpsPoint(trip.id, {
          latitude: waypoint.lat,
          longitude: waypoint.lng,
          accuracy: 5,
          speed: 12, // 12 m/s (~43 km/h)
          timestamp: Date.now(),
        });
        setTrip({ ...updated });

        return nextIdx;
      });
    }, 3000);

    return () => clearInterval(simInterval);
  }, [isSimulating, trip?.id]);

  if (!mounted || !trip) {
    return (
      <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-outline-variant text-center text-xs">
        Loading active trip...
      </div>
    );
  }

  const formatDuration = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleEndRide = () => {
    const ended = rentalTripService.endTrip(trip.id);
    setTrip({ ...ended });
    router.push(`/rider/trip/${trip.id}/confirm`);
  };

  const handleManualAddKm = (kmToAdd: number) => {
    const newDistance = Math.round((trip.gpsDistanceKm + kmToAdd) * 100) / 100;
    const waypoint = KOZHIKODE_SAMPLE_ROUTE[(routeIndex + 1) % KOZHIKODE_SAMPLE_ROUTE.length];
    const updated = rentalTripService.ingestGpsPoint(trip.id, {
      latitude: waypoint.lat + (Math.random() - 0.5) * 0.01,
      longitude: waypoint.lng + (Math.random() - 0.5) * 0.01,
      accuracy: 5,
      timestamp: Date.now() + 10000,
    });
    // Force distance for precise demo testing
    updated.gpsDistanceKm = newDistance;
    updated.estimatedEndOdometer = Math.round((updated.startOdometer + newDistance) * 100) / 100;
    updated.distanceChargeRupees = Math.round(newDistance * updated.ratePerKmRupees * 100) / 100;
    updated.totalAmountRupees = updated.distanceChargeRupees;
    mockStorage.updateRentalTrip(updated);
    setTrip({ ...updated });
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Live Status Header */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-sm text-on-surface uppercase tracking-wider">
              Ride in Progress
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span className="material-symbols-outlined text-sm">satellite_alt</span>
            <span>GPS Tracking</span>
          </div>
        </div>

        {/* Big Live Distance Meter matching Prompt #7 */}
        <div className="text-center py-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-1">
          <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
            Distance Travelled
          </span>
          <div className="text-5xl font-black text-primary font-mono tracking-tight">
            {trip.gpsDistanceKm.toFixed(1)} <span className="text-2xl font-bold">km</span>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">
            Live Cost: <strong className="text-on-surface font-bold">{formatCurrency(trip.totalAmountRupees || (trip.gpsDistanceKm * trip.ratePerKmRupees))}</strong> (₹{trip.ratePerKmRupees}/km)
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Starting ODO</span>
            <span className="font-bold text-base text-on-surface mt-0.5 block">{trip.startOdometer.toLocaleString()} km</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Estimated Current ODO</span>
            <span className="font-bold text-base text-primary mt-0.5 block">{trip.estimatedEndOdometer.toLocaleString()} km</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Trip Duration</span>
            <span className="font-bold text-base text-on-surface mt-0.5 block font-mono">{formatDuration(secondsElapsed)}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-[10px] text-on-surface-variant block uppercase font-semibold">Vehicle</span>
            <span className="font-bold text-sm text-on-surface mt-0.5 block truncate font-mono">{trip.vehicleRegNumber}</span>
          </div>
        </div>

        {/* Big End Ride Button matching Prompt #7 */}
        <button
          onClick={handleEndRide}
          className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">stop_circle</span>
          <span>End Ride</span>
        </button>

        {/* Interactive GPS Simulation Bar for Quick Testing */}
        <div className="pt-2 border-t border-outline-variant space-y-2 text-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="font-bold text-[11px]">GPS Simulator / Test Controls:</span>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                isSimulating ? 'bg-primary text-on-primary animate-pulse' : 'bg-surface border border-outline-variant text-on-surface'
              }`}
            >
              {isSimulating ? '● Simulating Driving' : '▶ Start Driving Sim'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleManualAddKm(1.0)}
              className="p-1.5 rounded bg-surface border border-outline-variant hover:bg-surface-container-low font-semibold text-[10px]"
            >
              + 1.0 km
            </button>
            <button
              onClick={() => handleManualAddKm(5.0)}
              className="p-1.5 rounded bg-surface border border-outline-variant hover:bg-surface-container-low font-semibold text-[10px]"
            >
              + 5.0 km
            </button>
            <button
              onClick={() => {
                // Quick jump to 25.1 km prompt scenario
                const diff = 25.1 - trip.gpsDistanceKm;
                if (diff > 0) handleManualAddKm(diff);
              }}
              className="p-1.5 rounded bg-surface border border-outline-variant hover:bg-surface-container-low font-semibold text-[10px]"
            >
              Set 25.1 km
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
