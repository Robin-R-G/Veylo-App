import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
