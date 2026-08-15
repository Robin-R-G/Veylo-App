import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Login — Veylo',
  description: 'Sign in to your Veylo account as Owner or Rider.',
};

// Static export: no dynamic params needed
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-on-surface-variant">Loading...</div></div>}>
      <LoginClient />
    </Suspense>
  );
}
