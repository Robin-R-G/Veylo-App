import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from 'sonner';
import { AdSenseScript } from '@/components/ads/GoogleAdSense';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Veylo — Vehicle Bills & Tracking',
  description: 'Track rides, split costs, get paid. Fleet billing and UPI payments in one simple app.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'Veylo — Vehicle Bills & Tracking',
    description: 'Track rides, split costs, get paid. Fleet billing and UPI payments in one simple app.',
    url: 'https://veylo.app',
    siteName: 'Veylo',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Veylo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veylo — Vehicle Bills & Tracking',
    description: 'Track rides, split costs, get paid. Fleet billing and UPI payments in one simple app.',
    images: ['/icon-512.png'],
  },
  metadataBase: new URL('https://veylo.app'),
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-background text-on-background antialiased min-h-screen font-sans" suppressHydrationWarning>
        <AdSenseScript client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''} />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
          }}
        />
        <AppShell>
          {children}
        </AppShell>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
