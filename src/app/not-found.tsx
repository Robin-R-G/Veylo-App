'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center mb-4 shadow">
        <span className="material-symbols-outlined text-3xl">map</span>
      </div>
      <h1 className="text-4xl font-extrabold text-on-background mb-2">404 — Page Not Found</h1>
      <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
        The page or route you are looking for does not exist or has been moved.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/"
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow"
        >
          Go to Home Page
        </Link>
        <Link
          href="/dashboard"
          className="bg-surface border border-outline-variant text-primary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-surface-container-low transition-all shadow-sm"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
