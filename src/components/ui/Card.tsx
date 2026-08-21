'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const Card: React.FC<CardProps> = ({ children, className,   hover,
  onClick,
}) => {
  const classes = clsx(
    'bg-surface rounded-2xl border border-outline-variant p-6 shadow-sm',
    hover && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all',
    className
  );

  if (onClick) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={classes}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={classes}>
      {children}
    </div>
  );
};
