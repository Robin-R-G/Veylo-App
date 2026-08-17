import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Veylo App — Move. Track. Pay.',
  description: 'Manage vehicles, track odometer mileage, calculate live fuel costs, generate transparent usage bills and collect UPI payments effortlessly with Veylo.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Veylo App — Move. Track. Pay.',
    description: 'Track vehicle usage, calculate precise fuel costs, and generate transparent usage bills.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#003441',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`light ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-background antialiased min-h-screen font-sans" suppressHydrationWarning>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
