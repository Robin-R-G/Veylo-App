'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { rentalTripService } from '@/lib/services/rentalTripService';
import { RentalTrip } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConfirmTripClient({ tripId }: { tripId: string }) {
  const router = useRouter();

  const [trip, setTrip] = useState<RentalTrip | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = mockStorage.getRentalTripById(tripId);
    if (t) {
      setTrip(t);
    }
  }, [tripId]);

  if (!mounted || !trip) {
    return (
      <div className="max-w-md mx-auto bg-surface p-8 rounded-2xl border border-outline-variant text-center text-xs">
        Loading trip confirmation...
      </div>
    );
  }

  const handleConfirmAndGenerateInvoice = () => {
    setIsConfirming(true);
    try {
      const { invoice } = rentalTripService.confirmTripAndGenerateInvoice(trip.id);
      router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      alert(err.message || 'Error generating invoice');
      setIsConfirming(false);
    }
  };

  const calculatedDistanceCharge = Math.round(trip.gpsDistanceKm * trip.ratePerKmRupees * 100) / 100;
  const calculatedTotal = calculatedDistanceCharge + (trip.otherChargesRupees || 0);

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      <PageHeader
        title="Confirm Trip"
        subtitle="Review automatic GPS distance calculation and generate final rental bill"
        icon="task_alt"
      />

      {/* Confirmation Card matching Prompt #10 */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-6">
        
        <div className="text-center pb-2 border-b border-outline-variant">
          <span className="text-xs font-semibold text-on-surface-variant uppercase">Vehicle Rental</span>
          <h2 className="text-2xl font-extrabold text-on-surface mt-1">{trip.vehicleModel}</h2>
          <span className="font-mono font-bold text-sm text-primary px-3 py-0.5 rounded-full bg-surface-container-low border border-outline-variant inline-block mt-1">
            {trip.vehicleRegNumber}
          </span>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <span className="text-on-surface-variant font-medium">Distance Travelled:</span>
            <span className="font-extrabold text-base text-primary font-mono">{trip.gpsDistanceKm.toFixed(1)} km</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <span className="text-on-surface-variant font-medium">Starting Odometer:</span>
            <span className="font-bold text-on-surface font-mono">{trip.startOdometer.toLocaleString()} km</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <span className="text-on-surface-variant font-medium">Estimated Ending Odometer:</span>
            <span className="font-bold text-on-surface font-mono">{trip.estimatedEndOdometer.toLocaleString()} km</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <span className="text-on-surface-variant font-medium">Rental Rate:</span>
            <span className="font-bold text-on-surface">₹{trip.ratePerKmRupees} / km</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <span className="text-on-surface-variant font-medium">Distance Charge ({trip.gpsDistanceKm.toFixed(1)} km × ₹{trip.ratePerKmRupees}):</span>
            <span className="font-bold text-on-surface">{formatCurrency(calculatedDistanceCharge)}</span>
          </div>

          <div className="pt-2 flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Total Amount Due</span>
            <span className="font-extrabold text-3xl text-primary">{formatCurrency(calculatedTotal)}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirmAndGenerateInvoice}
          disabled={isConfirming}
          className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">receipt_long</span>
          <span>{isConfirming ? 'Generating Invoice...' : 'Confirm & Generate Invoice'}</span>
        </button>
      </div>
    </div>
  );
}
