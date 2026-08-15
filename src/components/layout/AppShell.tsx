'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { authService } from '@/lib/services/authService';

// Routes accessible without authentication (public routes)
const PUBLIC_ROUTES = ['/v/', '/rider', '/login'];

// Routes that require OWNER role
const OWNER_ROUTES = ['/dashboard', '/vehicles', '/maintenance', '/admin', '/settings', '/invoices', '/estimator'];

// Routes that should show the full app shell (sidebar + navbar)
const SHELL_ROUTES = ['/dashboard', '/vehicles', '/maintenance', '/admin', '/settings', '/invoices', '/estimator'];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const session = authService.getSession();

    // Check if this route requires owner access
    const requiresOwner = OWNER_ROUTES.some(r => pathname.startsWith(r));
    
    if (requiresOwner && (!session || session.role === 'RIDER')) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Rider trying to access /rider/dashboard without session → redirect to /rider (entry)
    if (pathname.startsWith('/rider/dashboard') && !session) {
      router.replace('/rider');
      return;
    }
  }, [pathname, mounted, router]);

  const isPublicQR = pathname.startsWith('/v/');
  const isLoginPage = pathname === '/login';
  const isRiderPublicPage = pathname === '/rider' || pathname.startsWith('/rider/start/');
  
  // Minimal shell (no sidebar/navbar) for: login, public QR, rider entry
  const isMinimalShell = isLoginPage || isPublicQR || isRiderPublicPage;
  
  // Show full app shell for owner pages
  const showFullShell = SHELL_ROUTES.some(r => pathname.startsWith(r));

  if (isMinimalShell) {
    return (
      <div className="min-h-screen bg-background text-on-background antialiased">
        {children}
      </div>
    );
  }

  if (showFullShell) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 md:pl-[280px]">
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // Default: rider trip pages, invoice pages — show with navbar only (no sidebar)
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Navbar />
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 sm:p-6 pb-24">
        {children}
      </main>
    </div>
  );
};
