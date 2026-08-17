'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { authService } from '@/lib/services/authService';

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/v/', '/rider', '/login', '/admin/login'];

// Routes that require OWNER role
const OWNER_ROUTES = ['/dashboard', '/vehicles', '/maintenance', '/owner', '/settings', '/invoices', '/estimator'];

// Routes that require Platform Admin (SUPER_ADMIN) role
const ADMIN_ROUTES = ['/admin'];

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
    const isAdminPath = pathname.startsWith('/admin') && pathname !== '/admin/login';
    const isOwnerPath = OWNER_ROUTES.some(r => pathname.startsWith(r));

    // Admin route protection: must be logged in as Platform Admin
    if (isAdminPath) {
      if (!session || (!authService.isPlatformAdmin())) {
        router.replace('/admin/login');
        return;
      }
    }

    // Owner route protection: must be logged in as OWNER (or Admin visiting preview)
    if (isOwnerPath) {
      if (!session || session.role === 'RIDER') {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
    }

    // Rider trying to access /rider/dashboard without session
    if (pathname.startsWith('/rider/dashboard') && !session) {
      router.replace('/rider');
      return;
    }
  }, [pathname, mounted, router]);

  const isPublicQR = pathname.startsWith('/v/');
  const isLoginPage = pathname === '/login' || pathname === '/admin/login';
  const isRiderPublicPage = pathname === '/rider' || pathname.startsWith('/rider/start/');
  const isLandingPage = pathname === '/';
  
  // Minimal shell (no sidebar/navbar) for logins, public QR, and rider onboarding
  const isMinimalShell = isLoginPage || isPublicQR || isRiderPublicPage;
  
  // Admin Shell
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // Owner Shell
  const isOwnerRoute = OWNER_ROUTES.some(r => pathname.startsWith(r));

  if (isMinimalShell) {
    return (
      <div className="min-h-screen bg-background text-on-background antialiased">
        {children}
      </div>
    );
  }

  // Dedicated Platform Admin Shell
  if (isAdminRoute) {
    return (
      <div className="admin-theme min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 md:pl-[280px]">
          <header className="h-16 px-4 sm:px-6 lg:px-8 sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">admin_panel_settings</span>
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Veylo Platform Authority</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                RLS Central Enforcement
              </span>
            </div>
          </header>
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12 text-slate-100">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Owner App Shell
  if (isOwnerRoute) {
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

  // Default Shell (Rider trip / invoice pages)
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Navbar />
      <main className={`flex-1 w-full mx-auto p-4 sm:p-6 pb-24 ${
        isLandingPage ? 'max-w-7xl lg:px-8' : 'max-w-2xl'
      }`}>
        {children}
      </main>
    </div>
  );
};
