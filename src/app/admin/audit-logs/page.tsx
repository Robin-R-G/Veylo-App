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

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-2xl">verified_user</span>
            <h1 className="text-2xl font-black text-white tracking-tight">Security & Audit Trail Logs</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit record of all Platform Admin fuel price updates, rate overrides, and system changes.
          </p>
        </div>
        <Link
          href="/admin/fuel-rates"
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-sm text-amber-400">local_gas_station</span>
          Fuel Rate Authority
        </Link>
      </div>

      {/* Logs Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            Logged Events ({logs.length})
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            PROTECTED BY DATABASE TRIGGER & RLS
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-amber-400">sync</span>
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No audit records registered yet. Changes made in the Central Fuel Control will automatically appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
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
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-amber-400">
                      {log.eventType}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.fuelType === 'PETROL' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60' :
                        log.fuelType === 'DIESEL' ? 'bg-blue-950/60 text-blue-400 border border-blue-800/60' :
                        'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                      }`}>
                        {log.fuelType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {log.oldPriceRupees ? `₹${log.oldPriceRupees.toFixed(2)}` : '---'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {log.newPriceRupees ? `₹${log.newPriceRupees.toFixed(2)}` : '---'}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {log.city}, {log.state}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {log.sourceName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
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
