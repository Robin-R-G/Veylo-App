import React from 'react';
import ConfirmTripClient from './ConfirmTripClient';

export function generateStaticParams() {
  return [
    { tripId: 'TRIP-20260815-001' },
    { tripId: 'demo' },
  ];
}

export default async function Page({ params }: { params: Promise<{ tripId: string }> }) {
  const resolved = await params;
  return <ConfirmTripClient tripId={resolved.tripId} />;
}
