import React from 'react';
import {
  LayoutDashboard, Package, Radio, CalendarDays, Truck, LifeBuoy, User, X, Plane,
} from 'lucide-react';

export type FleetTab =
  | 'dashboard'
  | 'orders'
  | 'live-fleet'
  | 'fleet'
  | 'schedule'
  | 'analytics'
  | 'enquiries'
  | 'feedbacks';

interface NavItem {
  id: FleetTab;
  label: string;
  icon: React.ElementType;
  badge?: React.ReactNode;
}

interface FleetSidebarProps {
  active: FleetTab;
  onSelect: (tab: FleetTab) => void;
  counts: {
    deliveries: number;
    liveFlights: number;
    fleet: number;
    support: number;
  };
  onNavigateProfile: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const FleetSidebar: React.FC<FleetSidebarProps> = ({
  active,
  onSelect,
  counts,
  onNavigateProfile,
  mobileOpen,
  onCloseMobile,
}) => {
  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Deliveries', icon: Package, badge: counts.deliveries },
    { id: 'live-fleet', label: 'Live Fleet', icon: Radio, badge: counts.liveFlights || undefined },
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'fleet', label: 'RPAV Fleet', icon: Truck, badge: counts.fleet },
    { id: 'enquiries', label: 'Support', icon: LifeBuoy, badge: counts.support || undefined },
  ];

  const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
    const isActive = active === item.id || (item.id === 'enquiries' && active === 'feedbacks');
    const Icon = item.icon;
    return (
      <button
        onClick={() => { onSelect(item.id); onCloseMobile(); }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
        }`}
      >
        <Icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {item.badge !== undefined && item.badge !== 0 && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
            isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-slate-400'
          }`}>
            {item.badge}
          </span>
        )}
        {isActive && <span className="w-1 h-4 rounded-full bg-blue-500 absolute right-0" />}
      </button>
    );
  };

  const content = (
    <div className="flex flex-col h-full" style={{ background: 'var(--if-navy)' }}>
      <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b" style={{ borderColor: 'var(--if-navy-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-white text-sm font-bold tracking-tight">INDO FLEET</div>
            <div className="text-[10px] text-slate-500 font-medium tracking-wide">Operations Center</div>
          </div>
        </div>
        <button onClick={onCloseMobile} className="lg:hidden text-slate-400 hover:text-white cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto if-scrollbar">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Operations</div>
        {items.map(item => <div key={item.id} className="relative"><NavLink item={item} /></div>)}
      </nav>

      <div className="px-3 py-4 border-t shrink-0" style={{ borderColor: 'var(--if-navy-border)' }}>
        <button
          onClick={onNavigateProfile}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-colors cursor-pointer"
        >
          <User className="w-[17px] h-[17px] text-slate-500" />
          <span>Profile</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 shrink-0 fixed left-0 top-0 bottom-0 z-30">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-72">{content}</aside>
        </div>
      )}
    </>
  );
};

export default FleetSidebar;
