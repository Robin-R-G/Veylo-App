'use client';

import React from 'react';
import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-primary border-t-transparent',
        sizeMap[size],
        className
      )}
    />
  );
};
