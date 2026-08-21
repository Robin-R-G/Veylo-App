'use client';

import React from 'react';

export const SkipNav: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="fixed left-0 -top-full z-50 bg-primary text-on-primary px-4 py-2 text-sm font-semibold focus:top-0 transition-[top] duration-200"
    >
      Skip to content
    </a>
  );
};
