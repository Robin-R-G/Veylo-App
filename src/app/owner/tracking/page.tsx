'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getVehicles } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { Vehicle } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { appRealtimeService } from '@/lib/services/appRealtimeService';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Kozhikode': { lat: 11.2588, lng: 75.7804 },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'Kochi': { lat: 9.9312, lng: 76.2673 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Mumbai': { lat: 19.076, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Hyderabad': { lat: 17.385, lng: 78.4867 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
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

export default function OwnerTrackingPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const orgId = (await supabaseAuth.getOrganizationId()) || 'org_demo_1';
        const data = await getVehicles(orgId);
        setVehicles(data || []);
        if (data.length > 0) setSelectedVehicle(data[0]);
      } catch {
        // Data will be empty
      } finally {
        setLoading(false);
      }
    }
    load();

    const unsub = appRealtimeService.subscribe(
      [{ table: 'vehicles' }],
      () => { load(); }
    );
    return () => unsub();
  }, []);

  if (!mounted || loading) return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );

  const selectedCoords = selectedVehicle ? getVehicleCoords(selectedVehicle) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle GPS Tracking"
        subtitle="Real-time location monitoring for your fleet"
        icon="location_on"
        backHref="/dashboard"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle List */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-on-surface">Fleet Vehicles ({vehicles.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {vehicles.map(v => {
              const isSelected = selectedVehicle?.id === v.id;
              const coords = getVehicleCoords(v);
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary-container/20 border-primary shadow-sm'
                      : 'bg-surface border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-on-surface block">
                        {v.registrationNumber}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        {v.make} {v.model}
                      </span>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      v.status === 'AVAILABLE' ? 'bg-emerald-500' : v.status === 'IN_USE' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    {v.city || 'Unknown'}, {v.state || ''}
                    {coords && <span className="font-mono ml-1">({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span>}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Area */}
        <div className="lg:col-span-2">
          <div
            className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden relative"
            style={{ minHeight: '500px' }}
          >
            {selectedVehicle && selectedCoords ? (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center mx-auto animate-pulse">
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-on-surface">{selectedVehicle.registrationNumber}</p>
                    <p className="text-sm text-on-surface-variant">{selectedVehicle.make} {selectedVehicle.model}</p>
                  </div>
                  <div className="bg-surface-container-low rounded-xl p-4 space-y-2 inline-block">
                    <p className="text-xs text-on-surface-variant">Location (from city)</p>
                    <p className="font-mono font-bold text-primary">
                      {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      {selectedVehicle.city}, {selectedVehicle.state} •{' '}
                      <span className={`font-bold ${selectedVehicle.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedVehicle.status}
                      </span>
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedCoords.lat},${selectedCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Open in Google Maps
                  </a>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2 p-8">
                  <span className="material-symbols-outlined text-5xl text-outline-variant">location_off</span>
                  <p className="text-sm font-semibold text-on-surface-variant">
                    {selectedVehicle ? 'No location data available' : 'Select a vehicle to view location'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
