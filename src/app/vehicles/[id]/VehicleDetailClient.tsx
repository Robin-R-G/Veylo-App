'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mockStorage } from '@/lib/services/mockStorage';
import { Vehicle, OdometerRecord, MaintenanceRecord, Issue, ServiceType, RentalTrip } from '@/types';
import { calculateVehicleHealthScore } from '@/lib/services/vehicleHealthEngine';
import { formatCurrency, calculateRideCosts } from '@/lib/services/financialEngine';
import { fuelPriceService } from '@/lib/services/fuelPriceProvider';
import { AdSlot } from '@/components/ads/AdSlot';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function VehicleDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [odometerRecords, setOdometerRecords] = useState<OdometerRecord[]>([]);
  const [rentalTrips, setRentalTrips] = useState<RentalTrip[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [fuelPriceRupees, setFuelPriceRupees] = useState<number>(104.20);

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'timeline' | 'maintenance' | 'issues' | 'qr'>('ledger');

  // Physical Odometer Verification Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [physicalOdoInput, setPhysicalOdoInput] = useState<number>(0);
  const [verifyNotes, setVerifyNotes] = useState('');

  // Maintenance Modal
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintType, setMaintType] = useState<ServiceType>('ENGINE_OIL');
  const [maintCost, setMaintCost] = useState<number>(1500);
  const [maintNotes, setMaintNotes] = useState('');
  const [maintNextKm, setMaintNextKm] = useState<number>(15000);

  const [mounted, setMounted] = useState(false);

  const refreshData = () => {
    const v = mockStorage.getVehicleById(id);
    if (!v) return;

    setVehicle(v);
    setPhysicalOdoInput(v.currentOdometer);
    const state = mockStorage.getState();

    setOdometerRecords(state.odometerHistory.filter(o => o.vehicleId === v.id));
    setRentalTrips((state.rentalTrips || []).filter(t => t.vehicleId === v.id));
    setMaintenance(state.maintenanceRecords.filter(m => m.vehicleId === v.id));
    setIssues(state.issues.filter(i => i.vehicleId === v.id));

    fuelPriceService.getLatestFuelPrice(v.fuelType, v.state || 'Kerala', v.city || 'Kozhikode').then(fp => {
      setFuelPriceRupees(fp.priceRupees);
    });
  };

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, [id]);

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

  const handleVerifyOdometerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mockStorage.updateVehicleOdometer(
      vehicle.id,
      Number(physicalOdoInput),
      'OWNER_VERIFIED',
      undefined,
      verifyNotes || 'Owner verified physical vehicle dashboard reading'
    );
    setShowVerifyModal(false);
    refreshData();
  };

  const handleAddMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mockStorage.addMaintenanceRecord({
      vehicleId: vehicle.id,
      serviceType: maintType,
      serviceDate: new Date().toISOString().split('T')[0],
      odometerReading: vehicle.currentOdometer,
      costRupees: Number(maintCost),
      notes: maintNotes,
      nextDueOdometer: Number(maintNextKm),
    });
    setShowAddMaintenance(false);
    setMaintNotes('');
    refreshData();
  };

  // Ledger stats
  const totalTripsCount = rentalTrips.length;
  const totalGpsDistance = rentalTrips.reduce((sum, t) => sum + t.gpsDistanceKm, 0);

  return (
    <div className="space-y-6">
      
      {/* Standard Page Header */}
      <PageHeader
        title={vehicle.registrationNumber}
        subtitle={`${vehicle.make} ${vehicle.model} • Rate: ₹${vehicle.ratePerKmRupees || 12}/km • ${vehicle.city || 'Kozhikode'}, ${vehicle.state || 'Kerala'}`}
        backHref="/vehicles"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="px-3.5 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-semibold text-xs flex items-center gap-1.5 hover:bg-surface-container-low transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm text-primary">pin</span>
              Verify Physical ODO
            </button>

            <Link
              href={`/rider/start/${vehicle.securePublicId}`}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow hover:bg-emerald-800 transition-all"
            >
              <span className="material-symbols-outlined text-sm">directions_bike</span>
              Start Rider Trip
            </Link>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
        {[
          { id: 'ledger', label: 'Mileage Ledger', icon: 'menu_book' },
          { id: 'overview', label: 'Overview', icon: 'space_dashboard' },
          { id: 'timeline', label: 'ODO Audit Trail', icon: 'speed' },
          { id: 'maintenance', label: 'Maintenance Log', icon: 'build' },
          { id: 'issues', label: 'Issues', icon: 'warning' },
          { id: 'qr', label: 'Vehicle QR Tag', icon: 'qr_code_2' },
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

      {/* TAB 1: DIGITAL VEHICLE MILEAGE LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Last Verified KM</span>
              <p className="text-2xl font-extrabold text-on-surface font-mono">{vehicle.lastVerifiedOdometer?.toLocaleString() || vehicle.currentOdometer.toLocaleString()} km</p>
              <span className="text-[10px] text-emerald-700 font-semibold">● Physical reading confirmed</span>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold">System Estimated KM</span>
              <p className="text-2xl font-extrabold text-primary font-mono">{vehicle.currentOdometer.toLocaleString()} km</p>
              <span className="text-[10px] text-on-surface-variant font-medium">● Last Verified + GPS distance</span>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Total Completed Trips</span>
              <p className="text-2xl font-extrabold text-on-surface">{totalTripsCount}</p>
              <span className="text-[10px] text-on-surface-variant">Renter journeys recorded</span>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-1">
              <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Total GPS Distance</span>
              <p className="text-2xl font-extrabold text-emerald-800 font-mono">{totalGpsDistance.toFixed(1)} km</p>
              <span className="text-[10px] text-emerald-700 font-semibold">Audited GPS telemetry</span>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
              <div>
                <h3 className="font-bold text-base text-on-surface">Digital Trip & Mileage Ledger</h3>
                <p className="text-xs text-on-surface-variant">Immutable, auditable ledger of all GPS rental journeys</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Rider</th>
                    <th className="py-2.5 px-3 text-right">Start KM</th>
                    <th className="py-2.5 px-3 text-right">GPS Dist</th>
                    <th className="py-2.5 px-3 text-right">End KM</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Payment</th>
                    <th className="py-2.5 px-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {rentalTrips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                        No rider trips recorded for this vehicle yet. Use <strong>Start Rider Trip</strong> to log an automatic GPS journey.
                      </td>
                    </tr>
                  ) : (
                    rentalTrips.map((t) => (
                      <tr key={t.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                        <td className="py-3 px-3 font-mono">{new Date(t.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                        <td className="py-3 px-3 font-bold text-on-surface">{t.riderName}</td>
                        <td className="py-3 px-3 text-right font-mono">{t.startOdometer.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-primary">{t.gpsDistanceKm.toFixed(1)} km</td>
                        <td className="py-3 px-3 text-right font-mono">{t.estimatedEndOdometer.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-bold text-on-surface">{formatCurrency(t.totalAmountRupees)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {t.invoiceId ? (
                            <Link href={`/invoices/${t.invoiceId}`} className="text-primary font-semibold hover:underline">
                              View Bill →
                            </Link>
                          ) : (
                            <span className="text-on-surface-variant">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
            <h2 className="text-base font-bold text-on-surface">Vehicle Health & Key Metrics</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Current Odometer</span>
                <span className="text-2xl font-bold text-on-surface font-mono">{vehicle.currentOdometer.toLocaleString()} km</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Vehicle Mileage</span>
                <span className="text-2xl font-bold text-primary">{vehicle.mileageKmpl} km/L</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Rental Rate</span>
                <span className="text-2xl font-bold text-emerald-800">₹{vehicle.ratePerKmRupees || 12}/km</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-on-surface">Estimated Fuel Running Cost:</span>
                <span className="font-extrabold text-lg text-primary">{formatCurrency(calc.pricePerKmRupees)} / km</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">At {vehicle.mileageKmpl} km/L at current petrol rate (₹{fuelPriceRupees.toFixed(2)}/L).</p>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
            <h2 className="text-base font-bold text-on-surface">Health Score</h2>
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-center space-y-2">
              <div className="text-4xl font-extrabold text-primary">{health.score} <span className="text-sm font-normal text-on-surface-variant">/ 100</span></div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase">
                {health.statusLabel} CONDITION
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ODO TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-surface p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <h2 className="text-base font-bold text-on-surface">Odometer Verification Audit Trail</h2>
          <div className="space-y-3">
            {odometerRecords.map((rec) => (
              <div key={rec.id} className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-on-surface text-sm font-mono">{rec.newReading.toLocaleString()} km</span>
                  <span className="text-[11px] text-on-surface-variant block mt-0.5">
                    {new Date(rec.timestamp).toLocaleString()} • {rec.reason} • {rec.notes || 'Recorded'}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-surface border border-outline-variant font-mono text-[10px] text-primary font-bold">
                  +{rec.difference} km
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MAINTENANCE LOG */}
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

      {/* TAB 5: QR TAG */}
      {activeTab === 'qr' && (
        <div className="bg-surface p-8 rounded-xl border border-outline-variant shadow-sm max-w-md mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-on-surface">Unique Vehicle QR Code</h2>
          <p className="text-xs text-on-surface-variant">
            Attach this QR to your vehicle dashboard. When riders scan, it directly opens the Rider Mode verification page.
          </p>

          <div className="p-6 bg-white rounded-xl border border-outline-variant inline-block shadow">
            <QRCodeSVG
              value={typeof window !== 'undefined' ? `${window.location.origin}/rider/start/${vehicle.securePublicId}` : `http://localhost:3000/rider/start/${vehicle.securePublicId}`}
              size={180}
            />
          </div>

          <div className="font-mono font-bold text-base text-primary">
            {vehicle.registrationNumber}
          </div>

          <p className="text-[11px] text-on-surface-variant">
            QR URL: <code className="bg-surface-container-low px-2 py-0.5 rounded font-mono text-[10px]">/rider/start/{vehicle.securePublicId}</code>
          </p>
        </div>
      )}

      {/* Physical Odometer Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleVerifyOdometerSubmit} className="bg-surface rounded-2xl border border-outline-variant shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="border-b border-outline-variant pb-2">
              <h3 className="font-bold text-base text-on-surface">Verify Physical Odometer</h3>
              <p className="text-xs text-on-surface-variant">Reconcile system estimated reading with actual vehicle dashboard</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">System Estimated KM</label>
              <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-mono font-bold text-on-surface text-sm">
                {vehicle.currentOdometer.toLocaleString()} km
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Actual Physical Odometer Reading (KM) *</label>
              <input
                type="number"
                value={physicalOdoInput}
                onChange={(e) => setPhysicalOdoInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-primary font-bold text-base font-mono focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Verification Notes</label>
              <input
                type="text"
                placeholder="e.g. Verified at weekly maintenance check"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold shadow hover:bg-primary-container hover:text-on-primary-container"
              >
                Save & Reconcile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Maintenance Modal */}
      {showAddMaintenance && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddMaintenanceSubmit} className="bg-surface rounded-2xl border border-outline-variant shadow-xl p-6 max-w-md w-full space-y-4">
            <div className="border-b border-outline-variant pb-2">
              <h3 className="font-bold text-base text-on-surface">Log Vehicle Service</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Service Type</label>
              <select
                value={maintType}
                onChange={(e) => setMaintType(e.target.value as ServiceType)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs"
              >
                <option value="ENGINE_OIL">Engine Oil Replacement</option>
                <option value="BRAKE_SERVICE">Brake Service</option>
                <option value="TYRE_REPLACEMENT">Tyre Replacement</option>
                <option value="GENERAL_SERVICE">General Service</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Cost (₹)</label>
                <input
                  type="number"
                  value={maintCost}
                  onChange={(e) => setMaintCost(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Next Due KM</label>
                <input
                  type="number"
                  value={maintNextKm}
                  onChange={(e) => setMaintNextKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Notes</label>
              <textarea
                value={maintNotes}
                onChange={(e) => setMaintNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMaintenance(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      <AdSlot placement="vehicle-bottom" />
    </div>
  );
}
