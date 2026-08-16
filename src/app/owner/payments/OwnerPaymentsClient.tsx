'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPaymentsByOwner, getOrganization } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { formatCurrency } from '@/lib/services/financialEngine';
import { PageHeader } from '@/components/ui/PageHeader';
import { summarizeOwnerRevenue } from '@/lib/services/platformEconomics';
import { AppSession, Organization, Invoice } from '@/types';

export default function OwnerPaymentsClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [summary, setSummary] = useState({ todayRupees: 0, thisMonthRupees: 0, pendingRupees: 0, paidRupees: 0, totalRupees: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    (async () => {
      const user = await supabaseAuth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const appSession: AppSession = {
        role: 'OWNER',
        userId: user.id,
        name: user.email || user.id,
        createdAt: user.created_at,
      };
      setSession(appSession);

      const orgId = await supabaseAuth.getOrganizationId();
      if (orgId) {
        const orgData = await getOrganization(orgId);
        setOrg(orgData);
      }

      const payments = await getPaymentsByOwner(user.id);
      const invoices = payments
        .map(p => p.invoice)
        .filter((i): i is Invoice => Boolean(i));
      setSummary(summarizeOwnerRevenue(invoices));
      setHistory(payments);
      setMounted(true);
    })();
  }, [router]);

  if (!mounted || !session) return null;

  const pageSize = 20;
  const totalPages = Math.ceil(history.length / pageSize) || 1;
  const paginatedHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusBadge = (status: string) => {
    const cls =
      status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : status === 'PAYMENT_PROCESSING' || status === 'PAYMENT_INITIATED' ? 'bg-blue-100 text-blue-800 border-blue-300'
      : status === 'FAILED' || status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-300'
      : status === 'REFUNDED' ? 'bg-purple-100 text-purple-800 border-purple-300'
      : 'bg-amber-100 text-amber-800 border-amber-300';
    return `px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${cls}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Owner Payments"
        subtitle="Your rental earnings — completely separate from SaaS platform revenue"
        icon="account_balance_wallet"
        backHref="/dashboard"
        action={
          <Link
            href="/settings/payment"
            className="px-4 py-2.5 rounded-xl border border-primary text-primary font-bold text-xs flex items-center gap-1.5 hover:bg-primary hover:text-on-primary transition-all"
          >
            <span className="material-symbols-outlined text-sm">payments</span>
            UPI Settings
          </Link>
        }
      />

      {/* Revenue separation banner */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-base">account_balance</span>
        <p className="text-on-surface-variant leading-relaxed">
          This page shows <strong className="text-on-surface">your vehicle rental money</strong>. Subscriptions and
          platform fees paid to Veylo are recorded separately on the admin revenue dashboard and never appear here.
        </p>
      </div>

      {/* UPI destination card */}
      {org && (
        <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Payment Destination</span>
            <span className="font-mono font-extrabold text-lg text-primary mt-1 block">{org.upiId || 'Not configured'}</span>
            <span className="text-[11px] text-on-surface-variant">{org.upiPayeeName || 'Vehicle Owner'}</span>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase ${org.upiStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
              {org.upiStatus || 'NOT_CONFIGURED'}
            </span>
            <p className="text-[10px] text-on-surface-variant mt-1.5">
              Riders pay this UPI directly. Veylo never routes or holds owner money.
            </p>
          </div>
        </div>
      )}

      {/* Earnings summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Today's Rental Revenue</span>
          <span className="font-extrabold text-2xl text-emerald-800 mt-1 block">{formatCurrency(summary.todayRupees)}</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5 block">Paid invoices today</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">This Month</span>
          <span className="font-extrabold text-2xl text-primary mt-1 block">{formatCurrency(summary.thisMonthRupees)}</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5 block">Paid invoices this month</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Pending</span>
          <span className="font-extrabold text-2xl text-amber-800 mt-1 block">{formatCurrency(summary.pendingRupees)}</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5 block">Awaiting verification</span>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant shadow-sm">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Paid (All Time)</span>
          <span className="font-extrabold text-2xl text-emerald-800 mt-1 block">{formatCurrency(summary.paidRupees)}</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5 block">Confirmed owner earnings</span>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-surface p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <h2 className="font-bold text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Payment History
          </h2>
          <span className="text-xs text-on-surface-variant">{history.length} transactions</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 text-xs text-on-surface-variant space-y-1">
            <span className="material-symbols-outlined text-outline text-3xl">payments</span>
            <p className="font-semibold">No rental payments recorded yet.</p>
            <p>Completed rider trips will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Rider</th>
                    <th className="py-3 px-3">Vehicle</th>
                    <th className="py-3 px-3">Invoice</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map(pa => (
                    <tr key={pa.paymentId} className="border-b border-outline-variant hover:bg-surface-container-low transition-all">
                      <td className="py-3 px-3 text-on-surface-variant">
                        {new Date(pa.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-3 font-bold text-on-surface">{pa.rider?.name || pa.riderId.substring(0, 12)}</td>
                      <td className="py-3 px-3 font-mono text-on-surface-variant">{pa.vehicleRegNumber || '—'}</td>
                      <td className="py-3 px-3">
                        {pa.invoice ? (
                          <Link href={`/invoices/${pa.invoice.id}`} className="font-mono font-bold text-primary hover:underline">
                            {pa.invoice.invoiceNumber}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-primary">{formatCurrency(pa.amount)}</td>
                      <td className="py-3 px-3 text-right"><span className={statusBadge(pa.status)}>{pa.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant text-xs">
                <span className="text-on-surface-variant">
                  Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({history.length} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface disabled:opacity-40 font-bold hover:bg-surface-container-low transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface disabled:opacity-40 font-bold hover:bg-surface-container-low transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
