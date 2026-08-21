'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getVehicles, getMaintenanceRecords } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { Vehicle, MaintenanceRecord } from '@/types';
import { calculateVehicleHealthScore } from '@/lib/services/vehicleHealthEngine';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/services/financialEngine';

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // New Log Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [serviceType, setServiceType] = useState<string>('Engine Oil Replacement');
  const [odometerReading, setOdometerReading] = useState(12500);
  const [costRupees, setCostRupees] = useState(650);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const orgId = (await supabaseAuth.getOrganizationId()) || 'org_demo_1';
      const [v, records] = await Promise.all([
        getVehicles(orgId),
        getMaintenanceRecords([]),
      ]);
      setVehicles(v || []);
      setMaintenanceRecords(records || []);
      if (v.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(v[0].id);
      }
    } catch {
      // Data will be empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;

    setSaving(true);
    try {
      const newRec: MaintenanceRecord = {
        id: `maint_${Date.now()}`,
        vehicleId: selectedVehicleId,
        serviceType: serviceType as any,
        serviceDate,
        odometerReading: Number(odometerReading || 0),
        costRupees: Number(costRupees || 0),
        notes,
        createdAt: new Date().toISOString(),
      };

      const supabase = createClient();
      await supabase.from('maintenance_records').insert({
        id: newRec.id,
        vehicle_id: newRec.vehicleId,
        service_type: newRec.serviceType,
        service_date: newRec.serviceDate,
        odometer_reading: newRec.odometerReading,
        cost_rupees: newRec.costRupees,
        notes: newRec.notes,
      });

      setMaintenanceRecords((prev) => [newRec, ...prev]);
      setShowLogModal(false);
      setNotes('');
    } catch {
      // Offline / fallback addition
      const fallbackRec: MaintenanceRecord = {
        id: `maint_${Date.now()}`,
        vehicleId: selectedVehicleId,
        serviceType: serviceType as any,
        serviceDate,
        odometerReading: Number(odometerReading || 0),
        costRupees: Number(costRupees || 0),
        notes,
        createdAt: new Date().toISOString(),
      };
      setMaintenanceRecords((prev) => [fallbackRec, ...prev]);
      setShowLogModal(false);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return <ListSkeleton />;

  const totalServices = maintenanceRecords.length;
  const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.costRupees || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title="Maintenance Tracker"
        subtitle="Keep your fleet vehicles healthy, serviced, and road-ready."
        icon="build"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogModal(true)}
              className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Log Service
            </button>
            <Link
              href="/vehicles"
              className="px-4 py-2.5 rounded-lg bg-surface text-secondary border border-outline-variant font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-surface-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">directions_car</span>
              Fleet List
            </Link>
          </div>
        }
      />

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Active Fleet</span>
          <p className="text-3xl font-extrabold text-on-surface">{vehicles.length}</p>
          <span className="text-[10px] text-success font-semibold mt-1">● All fleet vehicles tracked</span>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Logged Services</span>
          <p className="text-3xl font-extrabold text-primary">{totalServices}</p>
          <span className="text-[10px] text-on-surface-variant font-semibold mt-1">● Total maintenance entries</span>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-on-surface-variant">Total Maintenance Expense</span>
          <p className="text-3xl font-extrabold text-on-surface">{formatCurrency(totalCost)}</p>
          <span className="text-[10px] text-success font-semibold mt-1">● Lifetime fleet upkeep</span>
        </div>
      </div>

      {/* Fleet Maintenance Status List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            <span>Loading fleet maintenance data...</span>
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon="build"
            title="No vehicles found"
            description="Add your first vehicle to start tracking maintenance."
            action={
              <Link href="/vehicles/new" className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs shadow hover:bg-primary-container hover:text-on-primary-container transition-all">
                Add Vehicle
              </Link>
            }
          />
        ) : (
          vehicles.map((v) => {
            const vMaint = maintenanceRecords.filter((m) => m.vehicleId === v.id);
            const health = calculateVehicleHealthScore(v.currentOdometer, vMaint, []);

            return (
              <div key={v.id} className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg tracking-wider text-on-surface bg-surface-container-low border border-outline-variant px-3 py-1 rounded font-mono">
                        {v.registrationNumber}
                      </span>
                      <span className="text-xs font-semibold text-on-surface">
                        {v.make} {v.model}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Current Odometer: {v.currentOdometer.toLocaleString()} km • Fuel: {v.fuelType} ({v.mileageKmpl} km/L)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-on-surface-variant block">Health Rating</span>
                      <span className="text-sm font-bold text-success flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm fill text-warning">star</span>
                        {health.score}/100 ({health.statusLabel})
                      </span>
                    </div>

                    <Link
                      href={`/vehicles/${v.id}`}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors flex items-center gap-1"
                    >
                      <span>View Vehicle</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                {/* Maintenance Log Records for this vehicle */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Service History & Tasks</h4>
                  {vMaint.length === 0 ? (
                    <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-surface-variant flex justify-between items-center">
                      <span>No custom services logged yet for this vehicle.</span>
                      <button
                        onClick={() => {
                          setSelectedVehicleId(v.id);
                          setOdometerReading(v.currentOdometer);
                          setShowLogModal(true);
                        }}
                        className="text-primary font-bold hover:underline"
                      >
                        + Log First Service
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {vMaint.map((rec) => (
                        <div key={rec.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-on-surface block">{rec.serviceType}</span>
                            <span className="text-[10px] text-on-surface-variant">
                              {rec.odometerReading.toLocaleString()} km • {new Date(rec.serviceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {rec.notes && <p className="text-[10px] text-on-surface-variant italic mt-0.5">{rec.notes}</p>}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success-container text-on-success-container font-mono">
                            {formatCurrency(rec.costRupees)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Log Service Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 border border-outline-variant shadow-2xl max-w-md w-full space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">build</span>
                <h3 className="font-bold text-base text-on-surface">Log Vehicle Service</h3>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">Select Vehicle</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value);
                    const veh = vehicles.find((x) => x.id === e.target.value);
                    if (veh) setOdometerReading(veh.currentOdometer);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-bold text-on-surface"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-medium text-on-surface"
                >
                  <option value="Engine Oil Replacement">Engine Oil Replacement</option>
                  <option value="Brake Pad Inspection & Replacement">Brake Pad Inspection & Replacement</option>
                  <option value="Tire Rotation & Pressure Check">Tire Rotation & Pressure Check</option>
                  <option value="Air Filter Replacement">Air Filter Replacement</option>
                  <option value="Battery Health Check">Battery Health Check</option>
                  <option value="Complete General Service">Complete General Service</option>
                  <option value="Custom Repair">Custom Repair</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Odometer (KM)</label>
                  <input
                    type="number"
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-bold text-on-surface"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    value={costRupees}
                    onChange={(e) => setCostRupees(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-bold text-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Service Date</label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-medium text-on-surface"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Service Notes / Garage</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized Service Center, oil 10W30"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container transition-all shadow"
                >
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
