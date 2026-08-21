'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const variantMap = {
  primary: 'bg-primary text-on-primary hover:opacity-95',
  secondary:
    'bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low',
  danger: 'bg-error text-on-error hover:opacity-95',
};

const sizeMap = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-5 text-xs', lg: 'h-12 px-6 text-xs' };

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  loading,
  icon,
  type = 'button',
  onClick,
}) => {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.02 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variantMap[variant],
        sizeMap[size],
        className
      )}
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </motion.button>
  );
};
