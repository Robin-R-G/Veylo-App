'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInvoiceById, getPaymentsByInvoiceId, getDisputeByTripId, createDispute, updatePaymentStatus } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { paymentService } from '@/lib/services/paymentService';
import { Invoice, PaymentAttempt, Dispute, AppSession } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { AdSlot } from '@/components/ads/AdSlot';
import { mockStorage } from '@/lib/services/mockStorage';

export default function InvoiceDetailClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Dispute form state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('PAYMENT_NOT_RECEIVED');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [disputeSuccessMsg, setDisputeSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      let inv = await getInvoiceById(id);
      if (!inv) {
        inv = mockStorage.getState().invoices.find(i => i.id === id) || mockStorage.getState().invoices[0];
      }
      if (inv) {
        setInvoice(inv);
        if (inv.tripId) {
          try {
            const d = await getDisputeByTripId(inv.tripId);
            if (d) setDispute(d);
          } catch {}
        }
      }
      try {
        setAttempts(await getPaymentsByInvoiceId(id));
      } catch {}
    } catch {
      const fallback = mockStorage.getState().invoices.find(i => i.id === id) || mockStorage.getState().invoices[0];
      if (fallback) setInvoice(fallback);
    }
  };

  useEffect(() => {
    setMounted(true);
    supabaseAuth.getSession().then(s => setSession(s));
    loadData();
  }, [id]);

  if (!mounted || !invoice) {
    return (
      <div className="bg-surface p-8 rounded-xl border border-outline-variant text-center text-on-surface-variant text-xs">
        Loading invoice details...
      </div>
    );
  }

  const snapshot = invoice.priceSnapshot;
  const capturedDate = snapshot ? new Date(snapshot.effectiveAt) : new Date();
  const capturedTimeStr = capturedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + capturedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const handleCopyBill = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Launch direct owner UPI transaction
  const handleLaunchUpi = async () => {
    try {
      const attempt = await paymentService.initiatePaymentAttempt({
        invoiceId: invoice.id,
        paymentMethod: 'UPI_DIRECT'
      });
      
      // Update UI state
      loadData();

      // Launch UPI client application
      if (invoice.upiDeepLink && typeof window !== 'undefined') {
        window.location.href = invoice.upiDeepLink;
      } else {
        const directLink = `upi://pay?pa=${invoice.payeeUpiId}&pn=${encodeURIComponent(invoice.payeeName || 'Owner')}&am=${invoice.totalRupees.toFixed(2)}&cu=INR&tr=${invoice.invoiceNumber}`;
        if (typeof window !== 'undefined') {
          window.location.href = directLink;
        }
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed.');
    }
  };

  // Settle invoice using Cash alternative
  const handlePayCash = async () => {
    try {
      await paymentService.initiatePaymentAttempt({
        invoiceId: invoice.id,
        paymentMethod: 'CASH'
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed.');
    }
  };

  // Settle verification through the secure webhook pipeline (never a client callback).
  const handleSimulateVerify = async (paymentId: string) => {
    try {
      const reference = `WEBHOOK_TXN_${Date.now()}`;
      const result = await paymentService.verifyPaymentAttempt(paymentId, reference);
      if (result.success) {
        loadData();
      } else {
        alert('Verification simulated check failed. Please check transaction reference.');
      }
    } catch (err: any) {
      alert(err.message || 'Verification error.');
    }
  };

  // Manual fallback owner bypass
  const handleVerifyOwnerConfirm = async () => {
    await updatePaymentStatus(invoice.id, 'PAID', 'MANUAL_OWNER_CONFIRMATION');
    loadData();
  };

  // Raise dispute
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice.tripId) return;

    await createDispute({
      tripId: invoice.tripId,
      invoiceId: invoice.id,
      raisedBy: session?.role === 'RIDER' ? 'RIDER' : 'OWNER',
      raisedByName: session?.name || invoice.customerName || 'Robin Rider',
      reason: disputeReason,
      claimedDistanceKm: invoice.distanceKm,
      evidence: disputeNotes,
      status: 'OPEN'
    });

    setDisputeSuccessMsg('✅ Dispute successfully raised. A system administrator will review.');
    setDisputeNotes('');
    setTimeout(() => {
      setDisputeSuccessMsg('');
      setShowDisputeForm(false);
      loadData();
    }, 3000);
  };

  // Check if owner VPA settings exist
  const isUpiConfigured = !!invoice.payeeUpiId && invoice.payeeUpiId !== 'vehicleowner@upi';
  const lastAttempt = attempts[0]; // most recent attempt

  // Determine back navigation link based on session role
  const getBackLink = () => {
    if (session?.role === 'RIDER') return '/rider/dashboard';
    return '/dashboard';
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Top Controls: Back & Share */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={getBackLink()} className="text-xs text-on-surface-variant font-semibold hover:text-on-surface flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyBill}
            className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-semibold text-on-surface flex items-center gap-1 hover:bg-surface-container-low transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-primary">
              {copied ? 'check' : 'share'}
            </span>
            <span>{copied ? 'Link Copied' : 'Share Bill'}</span>
          </button>
          
          <button
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant text-xs font-semibold text-on-surface flex items-center gap-1 hover:bg-surface-container-low transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-primary">print</span>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-6">
        
        {/* Header Badge & Title */}
        <div className="flex items-start justify-between border-b border-outline-variant pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary block">
              VEYLO VERIFIED USAGE BILL
            </span>
            <h1 className="text-xl font-black text-on-surface tracking-tight mt-0.5 font-mono">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Issued {new Date(invoice.issuedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block border ${
              invoice.paymentStatus === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : invoice.paymentStatus === 'PAYMENT_INITIATED' || invoice.paymentStatus === 'PAYMENT_PROCESSING'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {invoice.paymentStatus}
            </span>
          </div>
        </div>

        {/* Vehicle & Rider Identification */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Vehicle</span>
            <span className="font-extrabold text-sm text-on-surface font-mono mt-0.5 block">
              {invoice.vehicleRegNumber}
            </span>
            <span className="text-[11px] text-on-surface-variant">{invoice.vehicleMakeModel || 'Fleet Vehicle'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <span className="text-on-surface-variant text-[10px] uppercase font-bold block">Rider / User</span>
            <span className="font-bold text-sm text-on-surface mt-0.5 block">
              {invoice.customerName || 'Robin'}
            </span>
            <span className="text-[11px] text-on-surface-variant">{invoice.customerPhone || '+91 94000 11223'}</span>
          </div>
        </div>

        {/* Payee Target details */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">Payment Payee Target:</span>
            <span className="font-bold text-on-surface">{invoice.payeeName || 'Vehicle Owner'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant font-medium">Destination UPI ID:</span>
            <span className="font-mono font-bold text-primary">{invoice.payeeUpiId || 'Not Configured'}</span>
          </div>
        </div>

        {/* Journey Summary */}
        <div>
          <h2 className="font-bold text-sm text-on-surface mb-3 pb-2 border-b border-outline-variant">Journey Telemetry</h2>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">route</span>
                <span>Distance Travelled</span>
              </div>
              <span className="font-extrabold text-sm text-primary font-mono">{invoice.distanceKm} km</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm">speed</span>
                <span>Odometer</span>
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
              <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
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

        {/* Price Snapshot Box */}
        {snapshot && (
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">local_gas_station</span>
                {snapshot.fuelType || 'PETROL'} PRICE SNAPSHOT USED
              </span>
              <span className="font-extrabold text-emerald-800 text-sm">
                ₹{snapshot.priceRupees.toFixed(2)} / {snapshot.unit || 'L'}
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
          <h2 className="font-bold text-sm text-on-surface mb-3 pb-2 border-b border-outline-variant">Price Breakdown</h2>
          
          <div className="space-y-2 text-xs">
            {invoice.estimatedFuelLitres !== undefined && invoice.estimatedFuelCostRupees !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">
                  Fuel Expense ({invoice.estimatedFuelLitres.toFixed(2)} L × {snapshot ? `₹${snapshot.priceRupees.toFixed(2)}` : 'Fuel price temporarily unavailable'})
                </span>
                <span className="font-semibold text-on-surface">{formatCurrency(invoice.estimatedFuelCostRupees)}</span>
              </div>
            )}

            {(invoice.pricingMode === 'PER_KM' || invoice.ratePerKmRupees) && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Distance Charge ({invoice.distanceKm} km × ₹{invoice.ratePerKmRupees || 12})</span>
                <span className="font-semibold text-on-surface">{formatCurrency(invoice.subtotalRupees)}</span>
              </div>
            )}

            {invoice.platformFeeRupees ? (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Platform Service Fee</span>
                <span className="font-semibold text-on-surface">{formatCurrency(invoice.platformFeeRupees)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Platform & Taxes (Disabled)</span>
                <span>₹0.00</span>
              </div>
            )}

            <div className="pt-3 border-t border-outline-variant flex justify-between items-center">
              <span className="font-extrabold text-sm text-on-surface">TOTAL PAYABLE AMOUNT</span>
              <span className="font-extrabold text-xl text-primary font-mono">{formatCurrency(invoice.totalRupees)}</span>
            </div>
          </div>
        </div>

        {/* Actions Box */}
        {invoice.paymentStatus !== 'PAID' ? (
          <div className="pt-4 border-t border-outline-variant space-y-3.5 print:hidden">
            
            {isUpiConfigured ? (
              <button
                onClick={handleLaunchUpi}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow hover:opacity-95 transition-all"
              >
                <span>Pay with UPI</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex gap-2">
                  <span className="material-symbols-outlined text-amber-700">warning</span>
                  <p className="font-bold">Owner payment method is not configured.</p>
                </div>
                {session?.role === 'OWNER' && (
                  <Link
                    href="/settings/payment"
                    className="inline-block text-primary hover:underline font-bold text-[11px]"
                  >
                    Configure UPI in Payment Settings →
                  </Link>
                )}
              </div>
            )}

            {/* Cash alternative payment option */}
            <button
              onClick={handlePayCash}
              className="w-full bg-surface border border-outline-variant text-on-surface-variant py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface-container-low transition-all"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              Pay with Cash (Hand Over)
            </button>

            {/* Owner confirmation bypass */}
            {session?.role === 'OWNER' && (
              <button
                onClick={handleVerifyOwnerConfirm}
                className="w-full bg-slate-100 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Mark Paid (Manual Override)
              </button>
            )}

            {/* Simulation verification block */}
            {lastAttempt && lastAttempt.status !== 'PAID' && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">Simulated active transaction in progress</span>
                  <p className="text-[11px] text-blue-900 mt-1 leading-relaxed">
                    A transaction reference <strong>{lastAttempt.providerReference}</strong> was created. Direct verification from banking webhook must confirm payment status.
                  </p>
                </div>
                
                <button
                  onClick={() => handleSimulateVerify(lastAttempt.paymentId)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Simulate Bank Webhook Payment Success
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4 border-t border-outline-variant text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
              <span className="material-symbols-outlined text-2xl font-bold">check</span>
            </div>
            <h3 className="font-extrabold text-base text-emerald-800">Payment Successfully Completed</h3>
            {invoice.paidAt && (
              <p className="text-[10px] text-on-surface-variant">
                Paid at: {new Date(invoice.paidAt).toLocaleString()}
              </p>
            )}
            {invoice.paymentMethod && (
              <p className="text-[11px] text-on-surface-variant font-medium">
                Method: <strong className="uppercase">{invoice.paymentMethod}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Payment dispute section - Section 19 */}
      <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">gavel</span>
          Payment Dispute Resolution
        </h2>

        {dispute ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5 text-amber-900">
            <div className="flex items-center justify-between">
              <span className="font-bold">DISPUTE LODGED</span>
              <span className="px-2 py-0.5 rounded bg-amber-200 border border-amber-300 text-[10px] font-black uppercase text-amber-800">
                {dispute.status}
              </span>
            </div>
            <p className="font-medium text-amber-950">Reason: {dispute.reason}</p>
            <p className="leading-relaxed mt-1 text-on-surface-variant">Description: {dispute.evidence}</p>
            <span className="text-[10px] text-on-surface-variant block mt-1">

              File logged at {new Date(dispute.createdAt).toLocaleString()}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              If there was an issue with payment, wrong amount debited, or duplicate transactions, file a secure dispute. Disputed payments maintain audit trails without breaking history.
            </p>
            
            {showDisputeForm ? (
              <form onSubmit={handleRaiseDispute} className="space-y-3 pt-2">
                {disputeSuccessMsg && (
                  <p className="p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">{disputeSuccessMsg}</p>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Dispute Reason</label>
                  <select
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-semibold"
                  >
                    <option value="PAYMENT_NOT_RECEIVED">Payment Not Received</option>
                    <option value="WRONG_AMOUNT">Wrong Amount Debited</option>
                    <option value="DUPLICATE_PAYMENT">Duplicate Charge / Payment</option>
                    <option value="REFUND_REQUEST">Refund Requested</option>
                    <option value="INCORRECT_INVOICE">Incorrect Invoice Distance</option>
                    <option value="OTHER">Other Issues</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant mb-1">Description / Notes</label>
                  <textarea
                    required
                    value={disputeNotes}
                    onChange={e => setDisputeNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter transaction ID, banks involved, or explanation..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase shadow hover:opacity-90"
                  >
                    Submit Dispute
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisputeForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowDisputeForm(true)}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-primary font-bold text-xs flex items-center gap-1.5 hover:bg-surface-container-low transition-all"
              >
                <span className="material-symbols-outlined text-sm">add_alert</span>
                File Payment Dispute
              </button>
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
