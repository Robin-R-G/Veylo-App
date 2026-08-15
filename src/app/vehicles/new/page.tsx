'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockStorage } from '@/lib/services/mockStorage';
import { normalizeRegistrationNumber, formatRegistrationDisplay } from '@/lib/services/registrationNormalizer';
import { VehicleType, FuelType } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

export default function NewVehiclePage() {
  const router = useRouter();

  const [rawReg, setRawReg] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTORCYCLE');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [mileageKmpl, setMileageKmpl] = useState<number>(40);
  const [initialOdometer, setInitialOdometer] = useState<number>(12500);
  const [ratePerKmRupees, setRatePerKmRupees] = useState<number>(12);
  const [ownerUpiId, setOwnerUpiId] = useState('vehicleowner@upi');
  const [state, setState] = useState('Kerala');
  const [city, setCity] = useState('Kozhikode');
  const [notes, setNotes] = useState('');

  const normalizedKey = normalizeRegistrationNumber(rawReg);
  const formattedDisplay = formatRegistrationDisplay(rawReg);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rawReg.trim() || !make.trim() || !model.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    const created = mockStorage.addVehicle({
      organizationId: 'org_demo_1',
      ownerId: 'prof_owner_1',
      registrationNumber: formattedDisplay || rawReg.toUpperCase(),
      vehicleType,
      make,
      model,
      fuelType,
      mileageKmpl: Number(mileageKmpl),
      initialOdometer: Number(initialOdometer),
      ratePerKmRupees: Number(ratePerKmRupees || 12),
      ownerUpiId: ownerUpiId || 'vehicleowner@upi',
      requiresApproval: false,
      state,
      city,
      notes,
    });

    router.push(`/vehicles/${created.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Register New Vehicle"
        subtitle="Add vehicle with location-aware fuel price tracking"
        backHref="/vehicles"
        icon="add_circle"
      />

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm space-y-6">
        
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Vehicle Registration Number <span className="text-error">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. KL 16 P 78"
            value={rawReg}
            onChange={(e) => setRawReg(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono font-extrabold text-lg tracking-wider focus:outline-none focus:border-primary"
            required
          />
          {normalizedKey && (
            <div className="mt-2 p-2.5 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-between text-xs font-semibold">
              <span>Normalized Identifier:</span>
              <span className="font-mono font-bold">{normalizedKey}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Vehicle Category</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold"
            >
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="SCOOTER">Scooter</option>
              <option value="CAR">Car</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Fuel Type</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold"
            >
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="ELECTRIC">Electric</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Make / Brand</label>
            <input
              type="text"
              placeholder="e.g. Royal Enfield"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Model Name</label>
            <input
              type="text"
              placeholder="e.g. Classic 350"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold"
              required
            />
          </div>
        </div>

        {/* Location Selection (Indian API State & City) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-surface-container-low border border-outline-variant">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">location_on</span>
              State (India)
            </label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs"
            >
              <option value="Kerala">Kerala</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi">Delhi</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">City / District</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kozhikode, Trivandrum, Kochi"
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs font-semibold"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Estimated Mileage (km/L)</label>
            <input
              type="number"
              value={mileageKmpl}
              onChange={(e) => setMileageKmpl(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-primary text-sm font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Initial Odometer (KM)</label>
            <input
              type="number"
              value={initialOdometer}
              onChange={(e) => setInitialOdometer(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-sm font-bold"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Rental Rate (₹ / km) *
            </label>
            <input
              type="number"
              value={ratePerKmRupees}
              onChange={(e) => setRatePerKmRupees(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-primary font-bold text-sm"
              required
            />
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Used for automatic GPS billing</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Owner UPI ID *
            </label>
            <input
              type="text"
              placeholder="e.g. vehicleowner@upi"
              value={ownerUpiId}
              onChange={(e) => setOwnerUpiId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs font-mono font-semibold"
              required
            />
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Rider UPI payment recipient</span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Complete Vehicle Registration
        </button>
      </form>
    </div>
  );
}
