import { Metadata } from 'next';
import RiderDashboardClient from './RiderDashboardClient';

export const metadata: Metadata = {
  title: 'Rider Dashboard — Veylo',
  description: 'Your active ride, trip history, invoices and payments.',
};

export default function RiderDashboardPage() {
  return <RiderDashboardClient />;
}
