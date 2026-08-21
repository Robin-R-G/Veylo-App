import React from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Spinner size={size} />
      <span className="text-xs text-on-surface-variant">{message}</span>
    </div>
  );
};
