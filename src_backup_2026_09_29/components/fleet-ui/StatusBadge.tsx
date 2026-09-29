import React from 'react';

/**
 * Canonical status → color mapping for Indo Fleet.
 * Keep this the single source of truth so colors never drift across pages.
 */
const STATUS_STYLES: Record<string, string> = {
  // Fleet / drone statuses
  idle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'en-route': 'bg-blue-50 text-blue-700 border-blue-200',
  'in-flight': 'bg-blue-50 text-blue-700 border-blue-200',
  assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  charging: 'bg-amber-50 text-amber-700 border-amber-200',
  'on-hold': 'bg-amber-50 text-amber-700 border-amber-200',
  maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
  returning: 'bg-blue-50 text-blue-700 border-blue-200',
  offline: 'bg-slate-100 text-slate-600 border-slate-200',
  // Delivery statuses
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  'taking-off': 'bg-blue-50 text-blue-700 border-blue-200',
  approaching: 'bg-teal-50 text-teal-700 border-teal-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rescheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const DOT_STYLES: Record<string, string> = {
  idle: 'bg-emerald-500', available: 'bg-emerald-500', 'en-route': 'bg-blue-500',
  'in-flight': 'bg-blue-500', assigned: 'bg-indigo-500', scheduled: 'bg-indigo-500',
  charging: 'bg-amber-500', 'on-hold': 'bg-amber-500', maintenance: 'bg-orange-500',
  returning: 'bg-blue-500', offline: 'bg-slate-400', pending: 'bg-slate-400',
  'taking-off': 'bg-blue-500', approaching: 'bg-teal-500', delivered: 'bg-emerald-500',
  rescheduled: 'bg-amber-500', failed: 'bg-red-500', cancelled: 'bg-red-500', critical: 'bg-red-500',
};

export const StatusBadge: React.FC<{ status: string; withDot?: boolean; className?: string }> = ({
  status,
  withDot = true,
  className = '',
}) => {
  const key = (status || '').toLowerCase();
  const style = STATUS_STYLES[key] || 'bg-slate-100 text-slate-600 border-slate-200';
  const dot = DOT_STYLES[key] || 'bg-slate-400';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize whitespace-nowrap ${style} ${className}`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {key.replace(/-/g, ' ') || 'unknown'}
    </span>
  );
};

export default StatusBadge;
