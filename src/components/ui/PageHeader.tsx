'use client';

import React from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  icon?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backHref,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant mb-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors"
            title="Go back"
          >
            <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
            {title}
          </h1>
          {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
};
