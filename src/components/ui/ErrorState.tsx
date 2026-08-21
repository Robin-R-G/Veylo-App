import React from 'react';
import clsx from 'clsx';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      <span className="material-symbols-outlined text-error text-3xl">error</span>
      <p className="font-bold text-sm text-on-surface">{title}</p>
      {message && <p className="text-xs text-on-surface-variant mt-1">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
};
