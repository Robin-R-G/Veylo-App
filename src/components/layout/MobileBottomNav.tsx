'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isRouteActive } from '@/lib/navigation';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const items = [
    { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { label: 'Track', icon: 'location_on', href: '/owner/tracking' },
    { label: 'Vehicles', icon: 'directions_car', href: '/vehicles' },
    { label: 'Rider', icon: 'two_wheeler', href: '/rider' },
    { label: 'Payments', icon: 'payments', href: '/owner/payments' },
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
