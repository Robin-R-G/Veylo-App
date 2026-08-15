import { Metadata } from 'next';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings — Veylo',
  description: 'Manage your organization settings, UPI details, and platform configuration.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
