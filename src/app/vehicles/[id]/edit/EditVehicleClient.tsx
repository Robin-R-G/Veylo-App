'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getVehicleById } from '@/lib/services/supabase/data';
import { Vehicle, VehicleType, FuelType } from '@/types';
import { decodeVin } from '@/lib/services/nhtsaService';
import { reverseGeocode } from '@/lib/services/geocodingService';
import { PageHeader } from '@/components/ui/PageHeader';

export default function EditVehicleClient({ id }: { id: string }) {
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTORCYCLE');
  const [fuelType, setFuelType] = useState<FuelType>('PETROL');
  const [mileageKmpl, setMileageKmpl] = useState(40);
  const [manufacturingYear, setManufacturingYear] = useState<number>(2024);
  const [ratePerKmRupees, setRatePerKmRupees] = useState(12);
  const [ownerUpiId, setOwnerUpiId] = useState('');
  const [state, setState] = useState('Kerala');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [vinDecoding, setVinDecoding] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await getVehicleById(id).catch(() => null);
      if (!v) {
        setLoading(false);
        return;
      }
      setVehicle(v);
      setMake(v.make);
      setModel(v.model);
      setVin(v.vin || '');
      setVehicleType(v.vehicleType);
      setFuelType(v.fuelType);
      setMileageKmpl(v.mileageKmpl);
      setManufacturingYear(v.manufacturingYear || 2024);
      setRatePerKmRupees(v.ratePerKmRupees);
      setOwnerUpiId(v.ownerUpiId || '');
      setState(v.state);
      setCity(v.city);
      setNotes(v.notes || '');
      setLoading(false);
    })();
  }, [id]);

  const handleVinDecode = async () => {
    if (vin.length !== 17) return;
    setVinDecoding(true);
    try {
      const data = await decodeVin(vin);
      if (data.make) setMake(data.make);
      if (data.model) setModel(data.model);
      if (data.modelYear) {
        const yr = parseInt(data.modelYear);
        if (!isNaN(yr)) setManufacturingYear(yr);
        const body = (data.bodyClass ?? '').toLowerCase();
        if (body.includes('scooter') || body.includes('moped')) setVehicleType('SCOOTER');
        else if (body.includes('car') || body.includes('sedan') || body.includes('suv') || body.includes('hatchback')) setVehicleType('CAR');
        const fuel = (data.fuelTypePrimary ?? '').toLowerCase();
        if (fuel.includes('diesel')) setFuelType('DIESEL');
        else if (fuel.includes('cng') || fuel.includes('natural gas')) setFuelType('CNG');
        else if (fuel.includes('electric')) setFuelType('ELECTRIC');
        else setFuelType('PETROL');
      }
    } finally {
      setVinDecoding(false);
    }
  };

  const handleReverseGeocode = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (data.city) setCity(data.city);
        if (data.state) setState(data.state);
      } catch {}
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    setSaving(true);

    try {
      const res = await fetch('/api/vehicles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vehicle.id,
          make,
          model,
          vin: vin.length === 17 ? vin.toUpperCase() : undefined,
          vehicleType,
          fuelType,
          mileageKmpl: Number(mileageKmpl),
          manufacturingYear: Number(manufacturingYear),
          ratePerKmRupees: Number(ratePerKmRupees),
          ownerUpiId,
          state,
          city,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update vehicle');
      }

      router.push(`/vehicles/${vehicle.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <div className="h-10 bg-surface-container-low rounded-lg animate-pulse" />
        <div className="h-64 bg-surface-container-low rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title="Vehicle Not Found" backHref="/vehicles" icon="error" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Edit Vehicle"
        subtitle={`${vehicle.registrationNumber} — ${vehicle.make} ${vehicle.model}`}
        backHref={`/vehicles/${vehicle.id}`}
        icon="edit"
      />

      <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm space-y-5">

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">VIN (17-char)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              placeholder="Optional VIN"
              className="flex-1 px-4 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold tracking-wider focus:outline-none focus:border-primary uppercase"
            />
            <button
              type="button"
              onClick={handleVinDecode}
              disabled={vin.length !== 17 || vinDecoding}
              className="px-4 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-bold text-xs uppercase disabled:opacity-40 flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">{vinDecoding ? 'hourglass_empty' : 'search'}</span>
              Decode
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Make / Brand</label>
            <input type="text" value={make} onChange={(e) => setMake(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Model Name</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Vehicle Category</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold">
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="SCOOTER">Scooter</option>
              <option value="CAR">Car</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Fuel Type</label>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold">
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="ELECTRIC">Electric</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Manufacturing Year</label>
            <input type="number" value={manufacturingYear} onChange={(e) => setManufacturingYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface text-xs font-semibold" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Mileage (km/L)</label>
            <input type="number" value={mileageKmpl} onChange={(e) => setMileageKmpl(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-primary text-sm font-bold" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Rate (₹/km)</label>
            <input type="number" value={ratePerKmRupees} onChange={(e) => setRatePerKmRupees(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-primary text-sm font-bold" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-surface-container-low border border-outline-variant">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">location_on</span> State
            </label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">City</label>
            <div className="flex gap-2">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs font-semibold" />
              <button type="button" onClick={handleReverseGeocode}
                className="px-2 py-2 rounded bg-tertiary-container text-on-tertiary-container shrink-0" title="Auto-detect from GPS">
                <span className="material-symbols-outlined text-sm">my_location</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Owner UPI ID</label>
            <input type="text" value={ownerUpiId} onChange={(e) => setOwnerUpiId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs font-mono font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface border border-outline-variant text-on-surface text-xs" />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-lg bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
