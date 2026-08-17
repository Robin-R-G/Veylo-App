'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFuelService } from '@/lib/services/fuelPriceService';
import { FuelPriceAuditLog } from '@/types';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<FuelPriceAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function load() {
      setIsLoading(true);
      try {
        const data = await adminFuelService.getAuditLogs(100);
        setLogs(data);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (!mounted) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-surface-container-low rounded-lg" />
      <div className="p-6 rounded-2xl bg-surface border border-outline-variant space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 bg-surface-container-low rounded" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Security & Audit Trail Logs</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Immutable audit record of all Platform Admin fuel price updates, rate overrides, and system changes.
          </p>
        </div>
        <Link
          href="/admin/fuel-rates"
          className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-sm text-primary">local_gas_station</span>
          Fuel Rate Authority
        </Link>
      </div>

      {/* Logs Table */}
      <div className="p-6 rounded-2xl bg-surface border border-outline-variant shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">
            Logged Events ({logs.length})
          </h2>
          <span className="text-[10px] font-mono text-on-surface-variant">
            PROTECTED BY DATABASE TRIGGER & RLS
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-on-surface-variant text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-primary">sync</span>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs">
            No audit records registered yet. Changes made in the Fuel Rate Control will automatically appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Event Type</th>
                  <th className="py-3 px-3">Fuel Type</th>
                  <th className="py-3 px-3">Old Rate</th>
                  <th className="py-3 px-3">New Rate</th>
                  <th className="py-3 px-3">Jurisdiction</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-on-surface">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-primary">
                      {log.eventType}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.fuelType === 'PETROL' ? 'bg-primary-container/40 text-primary border border-primary/40' :
                        log.fuelType === 'DIESEL' ? 'bg-tertiary-container/40 text-tertiary border border-tertiary/40' :
                        'bg-secondary-container/40 text-secondary border border-secondary/40'
                      }`}>
                        {log.fuelType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-on-surface-variant">
                      {log.oldPriceRupees ? `₹${log.oldPriceRupees.toFixed(2)}` : '---'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-primary">
                      {log.newPriceRupees ? `₹${log.newPriceRupees.toFixed(2)}` : '---'}
                    </td>
                    <td className="py-3 px-3 text-on-surface">
                      {log.city}, {log.state}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-on-surface-variant">
                      {log.sourceName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-primary border border-primary/40">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
