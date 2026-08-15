import React from 'react';
import PublicVehicleQRClient from './PublicVehicleQRClient';

export function generateStaticParams() {
  return [
    { secureVehicleId: 'pub_kl08ab1234_z77c' },
    { secureVehicleId: 'pub_kl16p78_x99a' },
    { secureVehicleId: 'pub_mh02ck4321_y88b' },
  ];
}

export default async function Page({ params }: { params: Promise<{ secureVehicleId: string }> }) {
  const resolved = await params;
  return <PublicVehicleQRClient secureVehicleId={resolved.secureVehicleId} />;
}
