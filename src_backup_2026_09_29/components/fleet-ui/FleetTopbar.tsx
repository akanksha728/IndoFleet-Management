import React from 'react';
import { Menu, RefreshCw, Bell } from 'lucide-react';

interface FleetTopbarProps {
  title: string;
  subtitle?: string;
  userName: string;
  userRole?: string;
  connected: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenMobile: () => void;
  notificationCount?: number;
}

export const FleetTopbar: React.FC<FleetTopbarProps> = ({
  title,
  subtitle,
  userName,
  userRole = 'Admin',
  connected,
  refreshing,
  onRefresh,
  onOpenMobile,
  notificationCount = 0,
}) => {
  const initials = (userName || '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-4 h-16 px-4 sm:px-6 shrink-0"
      style={{ background: 'var(--if-surface)', borderBottom: '1px solid var(--if-border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onOpenMobile} className="lg:hidden text-slate-500 hover:text-slate-800 cursor-pointer shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] sm:text-base font-bold text-[var(--if-text)] truncate">{title}</h1>
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </span>
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          {subtitle && <p className="text-[11px] text-[var(--if-muted)] truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh telemetry"
          className="w-9 h-9 rounded-lg border border-[var(--if-border)] flex items-center justify-center text-slate-500 hover:text-[var(--if-primary)] hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          title="Notifications"
          className="relative w-9 h-9 rounded-lg border border-[var(--if-border)] flex items-center justify-center text-slate-500 hover:text-[var(--if-primary)] hover:border-blue-200 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[var(--if-border)]">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold text-[var(--if-text)]">{userName}</div>
            <div className="text-[10px] text-[var(--if-muted)] capitalize">{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default FleetTopbar;
