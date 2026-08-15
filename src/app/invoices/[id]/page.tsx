'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { Invoice } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { AdSlot } from '@/components/ads/AdSlot';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [copied, setCopied] = useState(false);
  const [upiInitiated, setUpiInitiated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = mockStorage.getState();
    const inv = state.invoices.find(i => i.id === resolvedParams.id);
    if (inv) {
      setInvoice(inv);
    }
  }, [resolvedParams.id]);

  if (!mounted || !invoice) {
    return (
      <div className="bg-surface p-8 rounded-xl border border-outline-variant text-center text-on-surface-variant text-xs">
        Usage Bill record not found.
      </div>
    );
  }

  const handleLaunchUpi = () => {
    setUpiInitiated(true);
    mockStorage.updateInvoicePaymentStatus(invoice.id, 'PAYMENT_INITIATED', 'UPI_INTENT');
    if (invoice.upiDeepLink && typeof window !== 'undefined') {
      window.location.href = invoice.upiDeepLink;
    }
  };

  const handleVerifyOwnerConfirm = () => {
    const updated = mockStorage.updateInvoicePaymentStatus(invoice.id, 'PAID', 'UPI_INTENT', `TXN_UPI_${Date.now()}`);
    setInvoice({ ...updated });
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const snapshot = invoice.priceSnapshot;
  const capturedTimeStr = snapshot ? new Date(snapshot.fetchedAt).toLocaleString() : new Date(invoice.issuedAt).toLocaleString();

  return (
    <div className="max-w-xl mx-auto space-y-6 print:bg-white print:text-black">
      
      {/* Top Header matching UIUX payment_summary/code.html */}
      <header className="flex justify-between items-center pb-4 border-b border-outline-variant print:hidden">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-on-surface">Ride Bill | {invoice.vehicleRegNumber}</h1>
            <p className="text-[11px] text-on-surface-variant">{invoice.invoiceNumber} • Issued {new Date(invoice.issuedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors"
            title="Share receipt link"
          >
            <span className="material-symbols-outlined text-sm">share</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors"
            title="Print PDF"
          >
            <span className="material-symbols-outlined text-sm">print</span>
          </button>
        </div>
      </header>

      {/* Main Payment Summary Card matching UIUX payment_summary/code.html */}
      <div className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm space-y-5 print:border-none">
        
        {/* Journey Summary Section */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant">
            <h2 className="font-bold text-base text-on-surface">Journey Summary</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              invoice.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {invoice.paymentStatus}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">route</span>
                <span>Distance Travelled</span>
              </div>
              <span className="font-bold text-on-surface">{invoice.distanceKm} km</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">speed</span>
                <span>Odometer Log</span>
              </div>
              <span className="font-semibold text-on-surface">{invoice.startOdometer} km → {invoice.endOdometer} km</span>
            </div>

            {invoice.mileageKmpl && (
              <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-sm">toys</span>
                  <span>Mileage Rating</span>
                </div>
                <span className="font-semibold text-on-surface">{invoice.mileageKmpl} km/L</span>
              </div>
            )}

            {invoice.estimatedFuelLitres !== undefined && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-sm">local_gas_station</span>
                  <span>Estimated Fuel Consumed</span>
                </div>
                <span className="font-bold text-primary">{invoice.estimatedFuelLitres.toFixed(2)} L</span>
              </div>
            )}

            {invoice.ratePerKmRupees && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-sm">paid</span>
                  <span>Rental Rate</span>
                </div>
                <span className="font-bold text-primary">₹{invoice.ratePerKmRupees} / km</span>
              </div>
            )}
          </div>
        </div>

        {/* Price Snapshot Box (if fuel mode) */}
        {snapshot && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">local_gas_station</span>
                PETROL PRICE SNAPSHOT USED
              </span>
              <span className="font-extrabold text-emerald-800 text-sm">
                ₹{(snapshot.pricePerLitreRupees || 104.20).toFixed(2)} / L
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
              <span>Captured: {capturedTimeStr}</span>
              <span>Location: {snapshot.city || 'Kozhikode'}, {snapshot.state || 'Kerala'}</span>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div>
          <h2 className="font-bold text-base text-on-surface mb-3 pb-2 border-b border-outline-variant">Price Breakdown</h2>
          
          <div className="space-y-2 text-xs">
            {invoice.estimatedFuelLitres !== undefined && invoice.estimatedFuelCostRupees !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Fuel Expense ({invoice.estimatedFuelLitres.toFixed(2)} L × ₹{(snapshot?.pricePerLitreRupees || 104.20).toFixed(2)})</span>
                <span className="font-semibold text-on-surface">{formatCurrency(invoice.estimatedFuelCostRupees)}</span>
              </div>
            )}

            {(invoice.pricingMode === 'PER_KM' || invoice.ratePerKmRupees) && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Distance Charge ({invoice.distanceKm} km × ₹{invoice.ratePerKmRupees || 12})</span>
                <span className="font-semibold text-on-surface">{formatCurrency(invoice.subtotalRupees)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-on-surface-variant">
              <span>Platform & Taxes (Disabled)</span>
              <span>₹0.00</span>
            </div>

            <div className="pt-3 border-t border-outline-variant flex justify-between items-center">
              <span className="font-extrabold text-sm text-on-surface">TOTAL PAYABLE AMOUNT</span>
              <span className="font-extrabold text-2xl text-primary">{formatCurrency(invoice.totalRupees)}</span>
            </div>
          </div>
        </div>

        {/* Sticky UPI Action Box matching UIUX payment_summary/code.html */}
        {invoice.paymentStatus !== 'PAID' && (
          <div className="pt-2 space-y-3 print:hidden">
            <a
              href={invoice.upiDeepLink || `upi://pay?pa=${invoice.payeeUpiId || 'owner@upi'}&pn=Vehicle%20Owner&am=${invoice.totalRupees.toFixed(2)}&cu=INR&tr=${invoice.invoiceNumber}`}
              onClick={handleLaunchUpi}
              className="w-full bg-primary text-on-primary py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <span>PAY NOW (Open UPI App)</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>

            <button
              onClick={handleVerifyOwnerConfirm}
              className="w-full bg-surface border border-outline-variant text-on-surface py-2.5 rounded-lg text-xs font-semibold hover:bg-surface-container-low transition-all"
            >
              Mark Paid (Owner Confirmation)
            </button>

            {upiInitiated && (
              <p className="text-[11px] text-primary text-center">
                UPI intent initiated. Awaiting owner payment verification.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="print:hidden">
        <AdSlot placement="invoice-bottom" />
      </div>
    </div>
  );
}
