'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { label: 'Vehicles', icon: 'directions_car', href: '/vehicles' },
    { label: 'Rides', icon: 'route', href: '/estimator' },
    { label: 'Fuel Rates', icon: 'local_gas_station', href: '/admin/fuel-rates' },
    { label: 'Maintenance', icon: 'build', href: '/maintenance' },
    { label: 'Usage Bills', icon: 'receipt_long', href: '/invoices/inv_101' },
    { label: 'Admin Control', icon: 'settings', href: '/admin' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface shadow-sm py-6 z-40">
      
      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary font-extrabold text-base shadow">
          VL
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-primary tracking-tight leading-tight">Veylo</h1>
          <p className="text-[11px] text-on-surface-variant font-semibold leading-tight">Move. Track. Pay.</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isRouteActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
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

      {/* Footer User Profile & Fleet Card */}
      <div className="mt-auto border-t border-outline-variant pt-4 px-4">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            R
          </div>
          <div className="text-xs overflow-hidden">
            <p className="font-bold text-on-surface truncate">Robin (Owner)</p>
            <p className="text-[10px] text-on-surface-variant font-medium truncate">Veylo Fleet Org</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
