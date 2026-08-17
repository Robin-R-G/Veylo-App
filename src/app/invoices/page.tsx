'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/client';
import { appRealtimeService } from '@/lib/services/appRealtimeService';
import { Invoice } from '@/types';
import { formatCurrency } from '@/lib/services/financialEngine';
import { mockStorage } from '@/lib/services/mockStorage';
import { supabaseAuth } from '@/lib/services/supabase/auth';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    async function loadInvoices() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('issued_at', { ascending: false });

        if (error || !data || data.length === 0) {
          // Fallback to mock storage for demo fleet
          const localInvoices = mockStorage.getState().invoices;
          setInvoices(localInvoices || []);
        } else {
          const mapped: Invoice[] = data.map((r: any) => ({
            id: r.id,
            organizationId: r.organization_id,
            tripId: r.trip_id,
            vehicleId: r.vehicle_id,
            vehicleRegNumber: r.vehicle_reg_number || 'KL 16 P 78',
            vehicleMakeModel: r.vehicle_make_model || 'Honda Activa 6G',
            invoiceNumber: r.invoice_number || r.id,
            title: r.title || 'USAGE BILL',
            customerName: r.customer_name || 'Fleet Rider',
            customerPhone: r.customer_phone || '+91 98765 43210',
            startOdometer: Number(r.start_odometer || 0),
            endOdometer: Number(r.end_odometer || 0),
            distanceKm: Number(r.distance_km || 0),
            mileageKmpl: Number(r.mileage_kmpl || 40),
            subtotalRupees: Number(r.subtotal_rupees || r.total_rupees || 0),
            taxRupees: Number(r.tax_rupees || 0),
            totalRupees: Number(r.total_rupees || 0),
            platformFeeRupees: Number(r.platform_fee_rupees || 0),
            payeeUpiId: r.payee_upi_id,
            payeeName: r.payee_name,
            upiDeepLink: r.upi_deep_link,
            paymentStatus: r.status || r.payment_status || 'PENDING',
            issuedAt: r.issued_at || r.created_at || new Date().toISOString(),
            paidAt: r.paid_at,
            notes: r.notes,
          }));
          setInvoices(mapped);
        }
      } catch {
        const localInvoices = mockStorage.getState().invoices;
        setInvoices(localInvoices || []);
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();

    const unsubscribe = appRealtimeService.subscribe(
      [{ table: 'invoices' }],
      () => { loadInvoices(); }
    );

    return () => unsubscribe();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && inv.paymentStatus === 'PAID') ||
        (statusFilter === 'PENDING' && inv.paymentStatus === 'PENDING') ||
        (statusFilter === 'OVERDUE' && (inv.paymentStatus as string) === 'OVERDUE');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.vehicleRegNumber.toLowerCase().includes(q) ||
        (inv.customerPhone && inv.customerPhone.includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [invoices, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalRevenue = invoices.reduce((sum, i) => sum + (i.totalRupees || 0), 0);
    const settledAmount = invoices
      .filter((i) => i.paymentStatus === 'PAID')
      .reduce((sum, i) => sum + (i.totalRupees || 0), 0);
    const pendingAmount = invoices
      .filter((i) => i.paymentStatus !== 'PAID')
      .reduce((sum, i) => sum + (i.totalRupees || 0), 0);

    return { totalCount, totalRevenue, settledAmount, pendingAmount };
  }, [invoices]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      
      {/* Standard Header */}
      <PageHeader
        title="Usage Bills & Invoices"
        subtitle="Manage, search, and verify all digital billing records across your fleet."
        icon="receipt_long"
        action={
          <Link
            href="/estimator"
            className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs flex items-center gap-1.5 shadow hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-sm">calculate</span>
            Calculate New Trip
          </Link>
        }
      />

      {/* Financial Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Total Invoices</span>
            <span className="material-symbols-outlined text-primary text-sm">receipt</span>
          </div>
          <p className="text-2xl font-extrabold text-on-surface">{metrics.totalCount}</p>
          <span className="text-[10px] text-on-surface-variant">All lifetime generated bills</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Gross Billed</span>
            <span className="material-symbols-outlined text-primary text-sm">account_balance</span>
          </div>
          <p className="text-2xl font-extrabold text-on-surface">{formatCurrency(metrics.totalRevenue)}</p>
          <span className="text-[10px] text-on-surface-variant">Rental + Fuel calculation</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Settled (Paid)</span>
            <span className="material-symbols-outlined text-emerald-700 text-sm">verified</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(metrics.settledAmount)}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Direct UPI confirmed</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Pending</span>
            <span className="material-symbols-outlined text-amber-700 text-sm">hourglass</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-700">{formatCurrency(metrics.pendingAmount)}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Awaiting rider payment</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'PAID', 'PENDING', 'OVERDUE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Search invoice, rider, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            <span>Fetching fleet invoices from Supabase...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-outline-variant">receipt_long</span>
            <p className="text-sm font-bold text-on-surface">No matching invoices found</p>
            <p className="text-xs text-on-surface-variant">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container text-on-surface-variant font-bold uppercase tracking-wider text-[10px] border-b border-outline-variant">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Vehicle</th>
                  <th className="py-3.5 px-4">Distance</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-medium">
                {filteredInvoices.map((inv) => {
                  const isPaid = inv.paymentStatus === 'PAID';
                  return (
                    <tr key={inv.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">receipt</span>
                          {inv.invoiceNumber || inv.id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-on-surface">{inv.customerName}</p>
                        {inv.customerPhone && (
                          <p className="text-[10px] text-on-surface-variant font-mono">{inv.customerPhone}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded border border-outline-variant/60">
                          {inv.vehicleRegNumber}
                        </span>
                        {inv.vehicleMakeModel && (
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{inv.vehicleMakeModel}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface">
                        {inv.distanceKm.toFixed(1)} km
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-sm text-on-surface">
                        {formatCurrency(inv.totalRupees)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAID ✓' : 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="px-3 py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary transition-all text-xs font-bold inline-flex items-center gap-1"
                        >
                          <span>View Bill</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
