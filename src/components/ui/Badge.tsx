'use client';

import React from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const variantMap = {
  success: 'bg-success-container text-on-success-container border-success/30',
  warning: 'bg-warning-container text-on-warning-container border-warning/30',
  error: 'bg-error-container text-on-error-container border-error/30',
  info: 'bg-info-container text-on-info-container border-info/30',
  neutral: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
};

const sizeMap = { sm: 'px-2 py-0.5 text-[10px]', md: 'px-3 py-1 text-xs' };

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'md',
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-block rounded-full font-bold uppercase tracking-wider border',
        variantMap[variant],
        sizeMap[size],
        className
      )}
    >
      {children}
    </span>
  );
};
