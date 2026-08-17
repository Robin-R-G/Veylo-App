'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';
import { authService } from '@/lib/services/authService';
import { AppSession } from '@/types';
import { VeyloLogo } from '@/components/ui/VeyloLogo';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    setSession(authService.getSession());
  }, []);

  const navItems = [
    { label: 'Overview', icon: 'dashboard', href: '/admin' },
    { label: 'Fuel Price Control', icon: 'local_gas_station', href: '/admin/fuel-rates' },
    { label: 'Trip Disputes', icon: 'gavel', href: '/admin/disputes' },
    { label: 'Platform Revenue', icon: 'bar_chart', href: '/admin/revenue' },
    { label: 'Monetization Flags', icon: 'tune', href: '/admin/settings/monetization' },
    { label: 'Audit Trail Logs', icon: 'verified_user', href: '/admin/audit-logs' },
  ];

  const handleLogout = async () => {
    await authService.logout();
    router.push('/admin/login');
  };

  const displayName = session?.name || 'Platform Admin';

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-screen fixed left-0 top-0 border-r border-outline-variant bg-slate-900 text-slate-100 shadow-xl py-6 z-50">
      
      {/* Admin Brand Header */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center p-2 shadow-lg text-slate-950">
          <VeyloLogo className="w-full h-full" color="black" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight leading-tight text-white">Veylo</h1>
            <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded tracking-wider uppercase">
              ADMIN
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-tight">Central Control Panel</p>
        </div>
      </div>

      {/* Security Status Card */}
      <div className="px-4 mb-4">
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Platform Security</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-slate-200 font-semibold text-[11px]">Database RLS Active</p>
          <p className="text-[10px] text-slate-400">Sole Central Price Authority</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Platform Controls
        </div>
        {navItems.map((item) => {
          const active = isRouteActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${active ? 'fill' : ''}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Quick Portals
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          <span>View Owner Dashboard</span>
        </Link>
        <Link
          href="/rider"
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
          <span>View Rider Portal</span>
        </Link>
      </nav>

      {/* Footer Identity & Sign Out */}
      <div className="mt-auto border-t border-slate-800 pt-4 px-4 space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
            SA
          </div>
          <div className="text-xs overflow-hidden flex-1">
            <p className="font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-amber-400 font-semibold truncate">SUPER_ADMIN</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-all border border-rose-900/40"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Exit Admin Session
        </button>
      </div>
    </aside>
  );
};
