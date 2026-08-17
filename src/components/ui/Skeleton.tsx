import React from 'react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface-container-high', className)}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-outline-variant space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="bento-col-8 bg-surface p-6 rounded-xl border border-outline-variant space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bento-col-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-4">
          <Skeleton className="h-5 w-36" />
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-80" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl bg-surface border border-outline-variant space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-48" />
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center justify-between border-b border-outline-variant last:border-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 bg-slate-800" />
          <Skeleton className="h-4 w-96 bg-slate-800" />
        </div>
        <Skeleton className="h-10 w-48 bg-slate-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Skeleton className="h-3 w-28 bg-slate-800" />
            <Skeleton className="h-7 w-24 bg-slate-800" />
            <Skeleton className="h-3 w-32 bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <Skeleton className="h-5 w-48 bg-slate-800" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <Skeleton className="h-6 w-6 bg-slate-700" />
                  <Skeleton className="h-4 w-24 bg-slate-700" />
                  <Skeleton className="h-3 w-32 bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
