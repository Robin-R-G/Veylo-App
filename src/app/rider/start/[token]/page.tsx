import React from 'react';
import RiderStartVehicleClient from './RiderStartVehicleClient';

export function generateStaticParams() {
  return [
    { token: 'pub_kl08ab1234_z77c' },
    { token: 'pub_kl16p78_x99a' },
    { token: 'pub_mh02ck4321_y88b' },
  ];
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const resolved = await params;
  return <RiderStartVehicleClient token={resolved.token} />;
}
