import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="if-card flex flex-col items-center justify-center text-center px-6 py-14">
    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-[var(--if-border)] flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <h3 className="text-sm font-bold text-[var(--if-text)] mb-1">{title}</h3>
    {description && <p className="text-xs text-[var(--if-muted)] max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
