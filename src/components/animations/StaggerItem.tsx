'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={clsx(className)}
    >
      {children}
    </motion.div>
  );
};
