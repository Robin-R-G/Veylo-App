import { Metadata } from 'next';
import DisputesClient from './DisputesClient';

export const metadata: Metadata = {
  title: 'Disputes — Admin — Veylo',
  description: 'Review and resolve trip distance disputes raised by riders or owners.',
};

export default function DisputesPage() {
  return <DisputesClient />;
}
