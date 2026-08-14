'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mockStorage } from '@/lib/services/mockStorage';
import { Vehicle, OdometerRecord, Ride, MaintenanceRecord, Issue, ServiceType } from '@/types';
import { calculateVehicleHealthScore } from '@/lib/services/vehicleHealthEngine';
import { formatCurrency, calculateRideCosts } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { AdSlot } from '@/components/ads/AdSlot';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [odometerRecords, setOdometerRecords] = useState<OdometerRecord[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [fuelPriceRupees, setFuelPriceRupees] = useState<number>(104.20);

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'maintenance' | 'issues' | 'rides' | 'qr'>('overview');

  // Modal / Form States
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintType, setMaintType] = useState<ServiceType>('ENGINE_OIL');
  const [maintCost, setMaintCost] = useState<number>(1500);
  const [maintNotes, setMaintNotes] = useState('');
  const [maintNextKm, setMaintNextKm] = useState<number>(15000);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const v = mockStorage.getVehicleById(resolvedParams.id);
    if (!v) return;

    setVehicle(v);
    const state = mockStorage.getState();

    setOdometerRecords(state.odometerHistory.filter(o => o.vehicleId === v.id));
    setRides(state.rides.filter(r => r.vehicleId === v.id));
    setMaintenance(state.maintenanceRecords.filter(m => m.vehicleId === v.id));
    setIssues(state.issues.filter(i => i.vehicleId === v.id));

    fuelPriceService.getLatestFuelPrice(v.fuelType, v.state || 'Kerala', v.city || 'Kozhikode').then(fp => {
      setFuelPriceRupees(fp.priceRupees);
    });
  }, [resolvedParams.id]);

  if (!mounted || !vehicle) {
    return (
      <div className="bg-surface p-8 rounded-xl border border-outline-variant text-center text-on-surface-variant text-xs">
        Loading vehicle records...
      </div>
    );
  }

  // Cost Per KM Projections
  const calc = calculateRideCosts({
    startOdometer: vehicle.currentOdometer,
    endOdometer: vehicle.currentOdometer + 10,
    mileageKmpl: vehicle.mileageKmpl,
    fuelPricePaise: Math.round(fuelPriceRupees * 100),
  });

  // Vehicle Health Score Calculation
  const health = calculateVehicleHealthScore(vehicle.currentOdometer, maintenance, issues);

  const handleAddMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRec = mockStorage.addMaintenanceRecord({
      vehicleId: vehicle.id,
      serviceType: maintType,
      serviceDate: new Date().toISOString().split('T')[0],
      odometerReading: vehicle.currentOdometer,
      costRupees: Number(maintCost),
      notes: maintNotes,
      nextDueOdometer: Number(maintNextKm),
    });

    setMaintenance([newRec, ...maintenance]);
    setShowAddMaintenance(false);
    setMaintNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title={vehicle.registrationNumber}
        subtitle={`${vehicle.make} ${vehicle.model} • ${vehicle.fuelType} • ${vehicle.city || 'Kozhikode'}, ${vehicle.state || 'Kerala'}`}
        backHref="/vehicles"
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/v/${vehicle.securePublicId}`}
              className="px-4 py-2 rounded-lg bg-surface border border-outline-variant text-primary font-semibold text-xs flex items-center gap-1.5 hover:bg-surface-container-low transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              Scan QR Flow
            </Link>

            <button
              onClick={() => setActiveTab('qr')}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-sm">qr_code_2</span>
              Get QR Badge
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: 'space_dashboard' },
          { id: 'timeline', label: 'ODO Timeline', icon: 'speed' },
          { id: 'maintenance', label: 'Maintenance Log', icon: 'build' },
          { id: 'issues', label: 'Issues', icon: 'warning' },
          { id: 'qr', label: 'QR Tag Code', icon: 'qr_code_2' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Card */}
          <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
            <h2 className="text-base font-bold text-on-surface">Vehicle Health & Key Metrics</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Current Odometer</span>
                <span className="text-2xl font-bold text-on-surface">{vehicle.currentOdometer.toLocaleString()} km</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Vehicle Mileage</span>
                <span className="text-2xl font-bold text-primary">{vehicle.mileageKmpl} km/L</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Fuel Rate ({vehicle.city || 'Kozhikode'})</span>
                <span className="text-2xl font-bold text-emerald-800">₹{fuelPriceRupees.toFixed(2)}/L</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface">Calculated Running Cost Per KM:</span>
                <span className="font-extrabold text-lg text-primary">{formatCurrency(calc.pricePerKmRupees)} / km</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Based on {vehicle.mileageKmpl} km/L mileage at current Kozhikode fuel price (₹{fuelPriceRupees.toFixed(2)}/L).</p>
            </div>
          </div>

          {/* Health Score Box */}
          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
            <h2 className="text-base font-bold text-on-surface">Vehicle Health Score</h2>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-center space-y-2">
              <div className="text-4xl font-extrabold text-primary">{health.score} <span className="text-sm font-normal text-on-surface-variant">/ 100</span></div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase">
                {health.statusLabel} CONDITION
              </div>
            </div>

            <div className="space-y-2 text-xs text-on-surface-variant">
              {health.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`material-symbols-outlined text-sm mt-0.5 ${
                    f.status === 'GOOD' ? 'text-emerald-700' : f.status === 'WARNING' ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {f.status === 'GOOD' ? 'check_circle' : f.status === 'WARNING' ? 'warning' : 'error'}
                  </span>
                  <div>
                    <span className="font-bold text-on-surface text-xs block">{f.label}</span>
                    <span className="text-[11px] text-on-surface-variant">{f.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-base font-bold text-on-surface">Smart Odometer Timeline</h2>
          <div className="space-y-3">
            {odometerRecords.map((rec) => (
              <div key={rec.id} className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-on-surface text-sm">{rec.newReading.toLocaleString()} km</span>
                  <span className="text-[11px] text-on-surface-variant block">{new Date(rec.timestamp).toLocaleString()} • {rec.reason}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-surface border border-outline-variant font-mono text-[10px]">VERIFIED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MAINTENANCE LOG */}
      {activeTab === 'maintenance' && (
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <h2 className="text-base font-bold text-on-surface">Maintenance Service Log</h2>
            <button
              onClick={() => setShowAddMaintenance(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1 shadow"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Log Maintenance
            </button>
          </div>

          <div className="space-y-3">
            {maintenance.map((m) => (
              <div key={m.id} className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-on-surface text-sm">{m.serviceType}</span>
                  <span className="text-[11px] text-on-surface-variant block">Date: {m.serviceDate} • ODO: {m.odometerReading} km</span>
                  {m.notes && <p className="text-[11px] text-on-surface-variant italic mt-1">{m.notes}</p>}
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary text-sm">₹{m.costRupees}</span>
                  <span className="text-[10px] text-emerald-800 font-bold block">Good</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ISSUES */}
      {activeTab === 'issues' && (
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-base font-bold text-on-surface">Reported Maintenance Issues</h2>
          {issues.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-4 text-center">No open issues reported.</p>
          ) : (
            issues.map((iss) => (
              <div key={iss.id} className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-on-surface">{iss.issueType}</span>
                  <p className="text-on-surface-variant mt-1">{iss.description}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                  {iss.severity} SEVERITY
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: QR TAG */}
      {activeTab === 'qr' && (
        <div className="bg-surface p-8 rounded-xl border border-outline-variant shadow-sm max-w-md mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-on-surface">Vehicle Public QR Code Tag</h2>
          <p className="text-xs text-on-surface-variant">Print & attach this QR tag to your vehicle dashboard. Riders can scan this to launch the 1-minute bill calculation page.</p>

          <div className="p-6 bg-white rounded-xl border border-outline-variant inline-block shadow">
            <QRCodeSVG
              value={typeof window !== 'undefined' ? `${window.location.origin}/v/${vehicle.securePublicId}` : `http://localhost:3000/v/${vehicle.securePublicId}`}
              size={180}
            />
          </div>

          <div className="font-mono font-bold text-sm text-primary">
            {vehicle.registrationNumber}
          </div>
        </div>
      )}

      <AdSlot placement="vehicle-bottom" />
    </div>
  );
}
