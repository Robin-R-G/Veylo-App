'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { Vehicle, MaintenanceRecord } from '@/types';
import { calculateVehicleHealthScore } from '@/lib/services/vehicleHealthEngine';
import { PageHeader } from '@/components/ui/PageHeader';

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = mockStorage.getState();
    setVehicles(state.vehicles);
    setMaintenanceRecords(state.maintenanceRecords);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Maintenance Tracker"
        subtitle="Keep your vehicles healthy and service-ready."
        icon="build"
        action={
          <Link
            href="/vehicles"
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-sm">directions_car</span>
            View Fleet Vehicles
          </Link>
        }
      />

      {/* Metric Summary Cards matching UIUX Request #8 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Vehicles Due</span>
          <p className="text-3xl font-extrabold text-on-surface">0</p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1">● All fleet vehicles operational</span>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Upcoming Services</span>
          <p className="text-3xl font-extrabold text-amber-600">2</p>
          <span className="text-[10px] text-amber-700 font-semibold mt-1">● Scheduled routine maintenance</span>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Overdue</span>
          <p className="text-3xl font-extrabold text-emerald-800">0</p>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1">● Zero overdue tasks</span>
        </div>
      </div>

      {/* Fleet Maintenance Status List */}
      <div className="space-y-4">
        {vehicles.map((v) => {
          const vMaint = maintenanceRecords.filter(m => m.vehicleId === v.id);
          const health = calculateVehicleHealthScore(v.currentOdometer, vMaint, []);

          return (
            <div key={v.id} className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-lg tracking-wider text-on-surface bg-surface-container-low border border-outline-variant px-3 py-1 rounded font-mono">
                      {v.registrationNumber}
                    </span>
                    <span className="text-xs font-semibold text-on-surface">{v.make} {v.model}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">Current Odometer: {v.currentOdometer.toLocaleString()} km</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-on-surface-variant block">Health Rating</span>
                    <span className="text-sm font-bold text-emerald-800 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm fill text-amber-500">star</span>
                      {health.score}/100 ({health.statusLabel})
                    </span>
                  </div>

                  <Link
                    href={`/vehicles/${v.id}`}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors"
                  >
                    View Log
                  </Link>
                </div>
              </div>

              {/* Maintenance Log Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Service Tasks</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-on-surface block">Engine Oil Replacement</span>
                      <span className="text-[10px] text-on-surface-variant">Due at: 15,000 km (Due in 2,432 km)</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Upcoming
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-on-surface block">Brake Pad Inspection</span>
                      <span className="text-[10px] text-on-surface-variant">Last verified: 12,000 km</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Good
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
