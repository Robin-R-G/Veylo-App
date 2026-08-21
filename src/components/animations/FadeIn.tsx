'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

const directionOffset = {
  up: { y: 12 },
  down: { y: -12 },
  left: { x: 12 },
  right: { x: -12 },
  none: {},
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 0.4,
  className,
  direction = 'up',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration, delay, ease: [0.23, 1, 0.32, 1] }}
      className={clsx(className)}
    >
      {children}
    </motion.div>
  );
};
