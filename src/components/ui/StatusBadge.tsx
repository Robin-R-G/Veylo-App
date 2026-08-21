'use client';

import React from 'react';
import { Badge, BadgeProps } from './Badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  PAID: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  FAILED: 'error',
  REJECTED: 'error',
  CANCELLED: 'error',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const variant = statusVariantMap[status.toUpperCase()] ?? 'info';
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
};
