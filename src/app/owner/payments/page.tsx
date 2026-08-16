'use client';

import React, { useEffect, useState } from 'react';
import { getInvoicesByOwner } from '@/lib/services/supabase/data';
import { supabaseAuth } from '@/lib/services/supabase/auth';
import { formatCurrency } from '@/lib/services/financialEngine';
import { PageHeader } from '@/components/ui/PageHeader';
import { summarizeOwnerRevenue } from '@/lib/services/platformEconomics';
import { Invoice } from '@/types';

export default function OwnerPaymentsPage() {
  const [mounted, setMounted] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState({ todayRupees: 0, thisMonthRupees: 0, pendingRupees: 0, paidRupees: 0, totalRupees: 0 });

  useEffect(() => {
    (async () => {
      const user = await supabaseAuth.getUser();
      if (!user) return;
      const allInvoices = await getInvoicesByOwner(user.id);
      setInvoices(
        allInvoices
          .filter(i => i.paymentStatus === 'PAID' || i.paymentStatus === 'PENDING')
          .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
      );
      setSummary(summarizeOwnerRevenue(allInvoices));
      setMounted(true);
    })();
  }, []);

  if (!mounted) return null;

  const statusBadge = (status: string) => {
    const paid = status === 'PAID';
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}
      >
        {paid ? 'SETTLED' : 'PENDING'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Owner Payments"
        subtitle="Vehicle earnings, settlement status & payment history"
        icon="account_balance_wallet"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Today's Earnings</span>
            <span className="material-symbols-outlined text-primary text-sm">payments</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{formatCurrency(summary.todayRupees)}</p>
          <span className="text-[10px] text-on-surface-variant">Gross trip income</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">This Month</span>
            <span className="material-symbols-outlined text-primary text-sm">calendar_month</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{formatCurrency(summary.thisMonthRupees)}</p>
          <span className="text-[10px] text-on-surface-variant">Gross trip income</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Settled</span>
            <span className="material-symbols-outlined text-emerald-700 text-sm">verified</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.paidRupees)}</p>
          <span className="text-[10px] text-on-surface-variant">Confirmed on-platform</span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center text-on-surface-variant mb-1">
            <span className="text-xs font-semibold uppercase">Pending</span>
            <span className="material-symbols-outlined text-amber-700 text-sm">hourglass</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(summary.pendingRupees)}</p>
          <span className="text-[10px] text-on-surface-variant">Awaiting settlement</span>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="text-base font-bold text-on-surface">Payment History</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Every bill issued against the fleet</p>
        </div>

        {invoices.length === 0 ? (
          <div className="p-10 text-center text-sm text-on-surface-variant">
            No trips billed yet. Earnings will appear here once invoices are issued.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {invoices.map(inv => (
              <div key={inv.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="material-symbols-outlined text-primary">receipt_long</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{inv.id}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-on-surface">{formatCurrency(inv.totalRupees)}</span>
                  {statusBadge(inv.paymentStatus)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
