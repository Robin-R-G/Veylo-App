'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { Vehicle, VehicleType } from '@/types';
import { calculateRideCosts, formatCurrency } from '@/lib/services/financialEngine';
import { PageHeader } from '@/components/ui/PageHeader';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = mockStorage.getState();
    setVehicles(state.vehicles);
  }, []);

  if (!mounted) return null;

  const filteredVehicles = filterType === 'ALL'
    ? vehicles
    : vehicles.filter(v => v.vehicleType === filterType);

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Vehicle Management"
        subtitle="Manage your fleet with normalized registration tracking."
        icon="directions_car"
        action={
          <Link
            href="/vehicles/new"
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Register New Vehicle
          </Link>
        }
      />

      {/* Category Filter Controls matching UIUX Request #10 */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-3">
        {['ALL', 'MOTORCYCLE', 'SCOOTER', 'CAR'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === tab
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-2 bg-surface p-8 rounded-xl border border-outline-variant text-center text-on-surface-variant text-xs">
            No vehicles match the selected filter.
          </div>
        ) : (
          filteredVehicles.map((v) => {
            const calc = calculateRideCosts({
              startOdometer: v.currentOdometer,
              endOdometer: v.currentOdometer + 1,
              mileageKmpl: v.mileageKmpl,
              fuelPricePaise: 10420,
            });

            return (
              <div key={v.id} className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4 flex flex-col justify-between">
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xl tracking-wider text-on-surface bg-surface-container-low border border-outline-variant px-3 py-1 rounded font-mono">
                      {v.registrationNumber}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container">
                      {v.vehicleType}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-on-surface">{v.make} {v.model}</h3>
                    <p className="text-xs text-on-surface-variant">Location: {v.city || 'Kozhikode'}, {v.state || 'Kerala'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                    <div className="p-2 rounded bg-surface-container-low border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block">Fuel Type</span>
                      <span className="font-semibold text-on-surface">{v.fuelType}</span>
                    </div>

                    <div className="p-2 rounded bg-surface-container-low border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block">Mileage</span>
                      <span className="font-semibold text-primary">{v.mileageKmpl} km/L</span>
                    </div>

                    <div className="p-2 rounded bg-surface-container-low border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant block">Cost/KM</span>
                      <span className="font-bold text-emerald-800">{formatCurrency(calc.pricePerKmRupees)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-outline-variant flex items-center justify-between gap-3 text-xs">
                  <Link
                    href={`/v/${v.securePublicId}`}
                    className="px-3 py-2 rounded-lg bg-surface border border-outline-variant text-primary font-semibold flex items-center gap-1 hover:bg-surface-container-low transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                    QR Link Flow
                  </Link>

                  <Link
                    href={`/vehicles/${v.id}`}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
                  >
                    Full Vehicle Dashboard →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
