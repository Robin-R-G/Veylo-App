'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isPublicCustomerQr = pathname.startsWith('/v/');

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Desktop Sidebar (Fixed 280px on Left for App) */}
      {!isPublicCustomerQr && <Sidebar />}

      {/* Main Content Column: Clean 280px Left Offset on Desktop so content is NEVER clipped */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${
        !isPublicCustomerQr ? 'md:pl-[280px]' : ''
      }`}>
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Persistent Bottom Navigation */}
      {!isPublicCustomerQr && <MobileBottomNav />}
    </div>
  );
};
