'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const items = [
    { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { label: 'Vehicles', icon: 'directions_car', href: '/vehicles' },
    { label: 'Scan QR', icon: 'qr_code_scanner', href: '/v/pub_kl16p78_x99a' },
    { label: 'Estimator', icon: 'calculate', href: '/estimator' },
    { label: 'Admin', icon: 'settings', href: '/admin' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-md border-t border-outline-variant z-50 flex items-center justify-around px-2">
      {items.map((item) => {
        const active = isRouteActive(pathname, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all ${
              active ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${active ? 'fill' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-medium tracking-tight mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
