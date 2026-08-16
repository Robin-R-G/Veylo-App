'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';
import { authService } from '@/lib/services/authService';
import { AppSession } from '@/types';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    setSession(authService.getSession());
  }, []);

  // Strict Owner-only navigation items. Zero Platform Admin links.
  const navItems = [
    { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { label: 'Vehicles', icon: 'directions_car', href: '/vehicles' },
    { label: 'Trip Estimator', icon: 'calculate', href: '/estimator' },
    { label: 'Maintenance', icon: 'build', href: '/maintenance' },
    { label: 'Usage Bills', icon: 'receipt_long', href: '/invoices/inv_101' },
    { label: 'Owner Payments', icon: 'payments', href: '/owner/payments' },
    { label: 'Settings', icon: 'settings', href: '/settings' },
  ];

  const handleLogout = () => {
    authService.clearSession();
    router.push('/login');
  };

  const displayName = session?.name || 'Owner';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface shadow-sm py-6 z-40">
      
      {/* Brand Header */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center p-2 shadow-md text-on-primary">
          <VeyloLogo className="w-full h-full" color="white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-primary tracking-tight leading-tight">Veylo</h1>
          <p className="text-[11px] text-on-surface-variant font-semibold leading-tight">Move. Track. Pay.</p>
        </div>
      </div>

      {/* Prominent "I'm a Rider" CTA Button */}
      <div className="px-4 mb-4">
        <Link
          href="/rider"
          className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-between shadow hover:bg-emerald-800 transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">directions_bike</span>
            <span>I'm a Rider</span>
          </div>
          <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isRouteActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-secondary-container text-primary font-bold border-l-4 border-primary rounded-r-xl shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${active ? 'fill' : ''}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Profile & Logout */}
      <div className="mt-auto border-t border-outline-variant pt-4 px-4 space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            {initials}
          </div>
          <div className="text-xs overflow-hidden flex-1">
            <p className="font-bold text-on-surface truncate">{displayName}</p>
            <p className="text-[10px] text-on-surface-variant font-medium truncate">Fleet Owner</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
};
