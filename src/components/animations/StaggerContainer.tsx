'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  stagger = 0.08,
}) => {
  return (
    <motion.div
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={clsx(className)}
    >
      {children}
    </motion.div>
  );
};
