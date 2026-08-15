import React from 'react';
import InvoiceDetailClient from './InvoiceDetailClient';

export function generateStaticParams() {
  return [
    { id: 'inv_101' },
    { id: 'demo' },
  ];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  return <InvoiceDetailClient id={resolved.id} />;
}
