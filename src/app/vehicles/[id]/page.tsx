import React from 'react';
import VehicleDetailClient from './VehicleDetailClient';

export function generateStaticParams() {
  return [
    { id: 'v_kl08ab1234' },
    { id: 'v_kl16p78' },
    { id: 'v_mh02ck4321' },
  ];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <VehicleDetailClient id={resolved.id} />;
}
