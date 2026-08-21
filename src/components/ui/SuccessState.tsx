'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { Button } from './Button';

interface SuccessStateProps {
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title = 'Success',
  message,
  action,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="material-symbols-outlined text-success text-3xl"
      >
        check_circle
      </motion.span>
      <p className="font-bold text-sm text-on-surface">{title}</p>
      {message && <p className="text-xs text-on-surface-variant mt-1">{message}</p>}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
};
