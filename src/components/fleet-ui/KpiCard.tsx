import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  sublabel?: string;
  live?: boolean;
}

const TONE_ICON: Record<string, string> = {
  default: 'bg-slate-50 text-slate-500',
  primary: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, tone = 'default', sublabel, live }) => {
  return (
    <div className="if-card px-5 py-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--if-muted)] truncate">
          {label}
        </span>
        {Icon ? (
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TONE_ICON[tone]}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        ) : live ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ) : null}
      </div>
      <div className="text-2xl font-bold text-[var(--if-text)] leading-none tabular-nums">{value}</div>
      {sublabel && <span className="text-[11px] text-[var(--if-muted-soft)]">{sublabel}</span>}
    </div>
  );
};

export default KpiCard;
