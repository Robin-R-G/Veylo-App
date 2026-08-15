'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { mockStorage } from '@/lib/services/mockStorage';
import { authService } from '@/lib/services/authService';
import { Dispute, DisputeStatus } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: 'bg-amber-100 text-amber-700' },
  UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

export default function DisputesClient() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<DisputeStatus | 'ALL'>('ALL');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    setMounted(true);
    const session = authService.getSession();
    if (!session || session.role === 'RIDER') {
      router.replace('/login');
      return;
    }
    setDisputes(mockStorage.getDisputes());
  }, [router]);

  if (!mounted) return null;

  const filtered = filter === 'ALL' ? disputes : disputes.filter(d => d.status === filter);

  const handleResolve = (disputeId: string, newStatus: DisputeStatus) => {
    if (newStatus === 'RESOLVED' && !resolution.trim()) {
      alert('Please enter a resolution note.');
      return;
    }
    const updated = mockStorage.updateDispute(disputeId, {
      status: newStatus,
      resolution: resolution || `Marked as ${newStatus} by admin`,
    });
    if (updated) {
      setDisputes(mockStorage.getDisputes());
      setSelectedDispute(null);
      setResolution('');
    }
  };

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const underReviewCount = disputes.filter(d => d.status === 'UNDER_REVIEW').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip Disputes"
        subtitle={`${openCount} open · ${underReviewCount} under review`}
        icon="gavel"
        backHref="/admin"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED'] as const).map(status => {
          const count = status === 'ALL' ? disputes.length : disputes.filter(d => d.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === status
                  ? 'border-primary bg-primary/10'
                  : 'border-outline-variant bg-surface hover:bg-surface-container-low'
              }`}
            >
              <p className="text-2xl font-extrabold text-on-surface">{count}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-medium mt-0.5">
                {status.replace(/_/g, ' ')}
              </p>
            </button>
          );
        })}
      </div>

      {/* Dispute List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">verified</span>
            <p className="font-semibold">No disputes found</p>
            <p className="text-xs mt-1">
              {filter === 'ALL' ? 'No disputes have been raised yet' : `No ${filter.toLowerCase().replace('_', ' ')} disputes`}
            </p>
          </div>
        )}

        {filtered.map(dispute => (
          <div
            key={dispute.id}
            className="bg-surface rounded-xl border border-outline-variant p-4 shadow-sm hover:border-primary transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_CONFIG[dispute.status].color}`}>
                    {STATUS_CONFIG[dispute.status].label}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {dispute.raisedBy === 'RIDER' ? '👤 Rider' : '🏢 Owner'} raised
                  </span>
                </div>
                <Link
                  href={`/rider/trip/${dispute.tripId}`}
                  className="font-mono text-sm font-bold text-primary hover:underline"
                >
                  {dispute.tripId}
                </Link>
                <p className="text-xs text-on-surface-variant mt-0.5">By: {dispute.raisedByName}</p>
              </div>
              {dispute.claimedDistanceKm && (
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">Claimed</p>
                  <p className="font-bold text-on-surface">{dispute.claimedDistanceKm} km</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface mb-3">
              <p className="font-semibold text-on-surface-variant mb-1">Reason:</p>
              <p>{dispute.reason}</p>
            </div>

            {dispute.resolution && (
              <div className="p-3 rounded-xl bg-emerald-50 text-xs text-emerald-800 mb-3">
                <p className="font-semibold mb-1">Resolution:</p>
                <p>{dispute.resolution}</p>
              </div>
            )}

            <p className="text-[10px] text-on-surface-variant mb-3">
              Raised: {new Date(dispute.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>

            {/* Actions */}
            {(dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW') && (
              <div className="space-y-2">
                {selectedDispute?.id === dispute.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      placeholder="Enter resolution note..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-sm text-on-surface resize-none focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(dispute.id, 'UNDER_REVIEW')}
                        className="flex-1 py-2 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold uppercase hover:bg-blue-200 transition-all"
                      >
                        Mark Under Review
                      </button>
                      <button
                        onClick={() => handleResolve(dispute.id, 'RESOLVED')}
                        className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold uppercase hover:bg-emerald-200 transition-all"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolve(dispute.id, 'REJECTED')}
                        className="flex-1 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold uppercase hover:bg-red-200 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedDispute(null)}
                      className="w-full py-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedDispute(dispute)}
                    className="w-full py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase hover:bg-primary/20 transition-all"
                  >
                    Take Action
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
