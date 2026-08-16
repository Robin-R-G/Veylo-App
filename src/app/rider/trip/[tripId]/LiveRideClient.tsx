'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRentalTripById } from '@/lib/services/supabase/data';
import { rentalTripService } from '@/lib/services/rentalTripService';
import { RentalTrip } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { KOZHIKODE_SAMPLE_ROUTE } from '@/lib/services/gpsTrackingEngine';

export default function LiveRideClient({ tripId }: { tripId: string }) {
  const router = useRouter();

  const [trip, setTrip] = useState<RentalTrip | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      const t = await getRentalTripById(tripId);
      if (t) {
        setTrip(t);
        const elapsed = Math.floor((Date.now() - new Date(t.startTime).getTime()) / 1000);
        setSecondsElapsed(Math.max(0, elapsed));
      }
    }
    load();
  }, [tripId]);

  // Real-time Timer Tick
  useEffect(() => {
    if (!trip || trip.status !== 'ACTIVE') return;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [trip]);

  // Real GPS Geolocation Watcher
  useEffect(() => {
    if (!trip || trip.status !== 'ACTIVE' || isSimulating) return;

    let watchId: number | null = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const updated = await rentalTripService.ingestGpsPoint(trip.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed || undefined,
            heading: pos.coords.heading || undefined,
            timestamp: pos.timestamp,
          });
          if (updated) setTrip(updated);
        },
        (err) => console.warn('GPS watch error:', err),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [trip?.id, trip?.status, isSimulating]);

  // Driving Route Simulator for Desktop Demo / Testing
  useEffect(() => {
    if (!isSimulating || !trip) return;

    const simInterval = setInterval(async () => {
      setRouteIndex((prevIdx) => {
        const nextIdx = (prevIdx + 1) % KOZHIKODE_SAMPLE_ROUTE.length;
        const pt = KOZHIKODE_SAMPLE_ROUTE[nextIdx];

        rentalTripService.ingestGpsPoint(trip.id, {
          latitude: pt.lat,
          longitude: pt.lng,
          accuracy: 5,
          speed: 42,
          timestamp: Date.now(),
        }).then(updated => { if (updated) setTrip(updated); });

        return nextIdx;
      });
    }, 2500);

    return () => clearInterval(simInterval);
  }, [isSimulating, trip]);

  if (!mounted || !trip) {
    return (
      <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-outline-variant text-center text-xs">
        Loading active ride telemetry...
      </div>
    );
  }

  // Format Duration HH:MM:SS
  const formatDuration = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleEndRide = async () => {
    await rentalTripService.endTrip(trip.id);
    router.push(`/rider/trip/${trip.id}/confirm`);
  };

  // Quick 25.1 km simulate jump (Prompt Scenario)
  const handleSimulateTarget25km = async () => {
    const updated = await rentalTripService.endTrip(trip.id, 25.1);
    setTrip(updated);
    router.push(`/rider/trip/${trip.id}/confirm`);
  };

  const currentCostRupees = Math.round(trip.gpsDistanceKm * trip.ratePerKmRupees * 100) / 100;

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Live HUD Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Ride in Progress</span>
        </div>
        <h1 className="text-2xl font-extrabold text-on-surface mt-2">{trip.vehicleModel}</h1>
        <span className="font-mono font-bold text-sm text-primary px-3 py-0.5 rounded-full bg-surface-container-low border border-outline-variant inline-block">
          {trip.vehicleRegNumber}
        </span>
      </div>

      {/* Main HUD Card matching Prompt #9 */}
      <div className="bg-surface rounded-3xl border border-outline-variant p-6 shadow-lg space-y-6">
        
        {/* Large Central Distance Counter */}
        <div className="text-center py-4 bg-surface-container-low rounded-2xl border border-outline-variant">
          <span className="text-xs uppercase font-bold text-on-surface-variant tracking-wider block">Distance Travelled</span>
          <div className="text-5xl font-black text-primary font-mono tracking-tight my-2">
            {trip.gpsDistanceKm.toFixed(1)} <span className="text-xl font-bold text-on-surface-variant">KM</span>
          </div>
          <span className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">my_location</span>
            GPS tracking active & accurate
          </span>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Starting ODO</span>
            <span className="font-bold text-base text-on-surface font-mono mt-0.5 block">
              {trip.startOdometer.toLocaleString()} km
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Estimated Current KM</span>
            <span className="font-bold text-base text-primary font-mono mt-0.5 block">
              {trip.estimatedEndOdometer.toLocaleString()} km
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Trip Duration</span>
            <span className="font-bold text-base text-on-surface font-mono mt-0.5 block">
              {formatDuration(secondsElapsed)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Live Fare (₹{trip.ratePerKmRupees}/km)</span>
            <span className="font-bold text-base text-emerald-800 font-mono mt-0.5 block">
              {formatCurrency(currentCostRupees)}
            </span>
          </div>
        </div>

        {/* Desktop Simulator Controls */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-secondary">navigation</span>
              Drive Simulation Controls:
            </span>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                isSimulating ? 'bg-amber-100 text-amber-800' : 'bg-surface border border-outline-variant text-primary'
              }`}
            >
              {isSimulating ? 'Pause Driving Sim' : 'Start Driving Sim'}
            </button>
          </div>

          <button
            onClick={handleSimulateTarget25km}
            className="w-full py-1.5 rounded bg-surface border border-outline-variant text-[11px] font-bold text-primary hover:bg-surface-container-high transition-all"
          >
            ⚡ Fast-Forward to 25.1 KM Journey (₹301.20)
          </button>
        </div>

        {/* End Ride Button */}
        <button
          onClick={handleEndRide}
          className="w-full py-4 rounded-2xl bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-rose-800 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">stop_circle</span>
          <span>End Ride & View Bill</span>
        </button>
      </div>
    </div>
  );
}
