import React, { useState } from 'react';
import { 
  BookOpen, Shield, DownloadCloud, Book, Terminal, Compass, Package, 
  MapPin, Truck, CheckCircle2, ChevronRight, ArrowRight, ExternalLink, 
  Sparkles, AlertCircle, Clock, Search, Layers, Radio, HelpCircle, 
  FileText, Zap, ShieldCheck, Check, Navigation, CreditCard, Award, User
} from 'lucide-react';

interface DocsPageProps {
  onNavigate: (page: string) => void;
  onOpenCommandCenter?: () => void;
  onOpenDemoBooking?: () => void;
}

export const DocsPage: React.FC<DocsPageProps> = ({ 
  onNavigate, 
  onOpenCommandCenter, 
  onOpenDemoBooking 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'ordering' | 'platform' | 'gcs' | 'admin' | 'safety'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>('doc-ordering');

  const docCards = [
    {
      id: 'doc-platform',
      tag: 'Platform Overview',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ShieldCheck,
      title: 'How the IndoWings ecosystem works',
      desc: 'Command Center, GCS, account access, role-based permissions, trusted devices, aircraft lifecycle, releases, support, and audit review.',
      linkText: 'Open platform overview',
      category: 'platform',
      targetPage: 'platform'
    },
    {
      id: 'doc-gcs-install',
      tag: 'Quick Start',
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: DownloadCloud,
      title: 'Install and prepare IndoWings GCS',
      desc: 'Start with the latest installer metadata, SHA-256 checksum, system requirements, Windows installation, and safe ground setup guidance.',
      linkText: 'Open quick start',
      category: 'gcs',
      targetPage: 'downloads'
    },
    {
      id: 'doc-ordering',
      tag: 'Delivery Guide',
      tagColor: 'bg-purple-50 text-[#3b0080] border-purple-200',
      icon: Package,
      featured: true,
      title: 'How to Order & Dispatch Drone Deliveries',
      desc: 'Complete operational walkthrough: entering pickup/drop coordinates, payload limits, live distance & fare calculation, Razorpay/COD payment, and live radar flight tracking.',
      linkText: 'Open ordering guide',
      category: 'ordering'
    },
    {
      id: 'doc-admin',
      tag: 'Admin Guide',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Shield,
      title: 'Command Center administration & Dispatch Board',
      desc: 'Accounts, organizations, users, role permissions, fleet operations, live radar telemetry, flight corridor holds, and callback enquiry management.',
      linkText: 'View admin guidance',
      category: 'admin',
      targetPage: 'dispatch'
    },
    {
      id: 'doc-pilot',
      tag: 'Pilot Guide',
      tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Compass,
      title: 'Mission planning and autonomous flight mode',
      desc: 'Aircraft connection, waypoint planning, preflight calibrations, live telemetry downlinks, failsafe geofence return, and synced field workflows.',
      linkText: 'Open pilot guidance',
      category: 'gcs',
      targetPage: 'gcs'
    },
    {
      id: 'doc-safety',
      tag: 'Safety & DGCA',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Award,
      title: 'Terrace Landing & DGCA Airspace Compliance',
      desc: 'Digital Sky Green Zone corridor rules, 3×3 metre clear terrace criteria, winch tether protocols, wind limits, and contactless handover safety.',
      linkText: 'View compliance guidance',
      category: 'safety'
    }
  ];

  const filteredCards = docCards.filter(card => {
    if (activeTab !== 'all' && card.category !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return card.title.toLowerCase().includes(q) || card.desc.toLowerCase().includes(q) || card.tag.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#f7f4fb] text-[#171222]">
      {/* ── HERO SECTION (Exact SkyGrid Purple Aesthetics) ──────────────────── */}
      <section 
        className="relative text-white pt-16 pb-24 px-6 overflow-hidden" 
        style={{ background: 'linear-gradient(135deg, #1e0940 0%, #2b114d 50%, #1a0835 100%)' }}>
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
        
        <div className="relative max-w-6xl mx-auto">
          {/* Bookmark Icon Box */}
          <div className="w-14 h-14 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-purple-950/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>

          <p className="text-xs font-bold tracking-[0.25em] uppercase text-purple-300 mb-3">
            DOCUMENTATION
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight max-w-3xl leading-[1.1]">
            IndoWings documentation library
          </h1>

          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            Public operating references for GCS, Command Center workflows, autonomous drone delivery ordering, downloads, and flight operations support.
          </p>
        </div>
      </section>

      {/* ── PUBLIC GUIDE SHOWCASE BANNER (Matches Screenshot 2) ─────────────── */}
      <section className="max-w-6xl mx-auto px-6 -mt-10 relative z-10 mb-14">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3b0080] bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 inline-block mb-2">
                PUBLIC GUIDE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171222] tracking-tight">
                Professional docs for operators, customers, and fleet administrators.
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { onNavigate('order'); window.history.pushState({}, '', '/order'); }}
                className="flex items-center gap-2 bg-[#3b0080] hover:bg-[#280058] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer">
                <Package className="w-4 h-4" />
                <span>Place Delivery Order</span>
              </button>
              <button
                onClick={() => { onNavigate('gcs'); window.history.pushState({}, '', '/gcs'); }}
                className="hidden sm:flex items-center gap-2 border border-slate-200 hover:border-[#3b0080] text-slate-700 hover:text-[#3b0080] text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl transition-all cursor-pointer">
                <Book className="w-4 h-4" />
                <span>Open GCS guide</span>
              </button>
            </div>
          </div>

          {/* 3 Visual Mini-Dashboards (Matches Screenshot 2 Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Dispatch & Coordinates */}
            <div className="bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] rounded-2xl p-5 text-white border border-slate-800 shadow-md flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="font-mono">CORRIDOR LOCK</span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold text-[10px]">LIVE RADAR</span>
                </div>
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">FLIGHT TIME</span>
                    <span className="text-xl font-bold font-mono text-purple-200">18 min</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">DISTANCE</span>
                    <span className="text-xl font-bold font-mono text-purple-200">14.8 km</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Transit & Route Mapping</span>
                <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded font-mono">Step 1</span>
              </div>
            </div>

            {/* Card 2: Mission Archive & Orders */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-bold uppercase text-[11px] tracking-wider">Mission Archive</span>
                  <span className="bg-purple-100 text-[#3b0080] font-bold text-[10px] px-2 py-0.5 rounded-full">ACTIVE</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-mono font-bold text-slate-700">ORD-782190</span>
                    </div>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">Delivered</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
                      <span className="font-mono font-bold text-slate-700">ORD-419205</span>
                    </div>
                    <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded text-[10px]">In-Flight</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Orders Queue & Archive</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">Step 2</span>
              </div>
            </div>

            {/* Card 3: Analytics & Review */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-bold uppercase text-[11px] tracking-wider">Performance Insights</span>
                  <span className="text-[10px] font-mono text-slate-400">NCR Hub</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center my-1">
                  <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                    <span className="text-base font-bold text-purple-700 font-mono block">99.4%</span>
                    <span className="text-[9px] text-slate-400 font-bold">SUCCESS</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                    <span className="text-base font-bold text-purple-700 font-mono block">&lt;24m</span>
                    <span className="text-[9px] text-slate-400 font-bold">AVG ETA</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                    <span className="text-base font-bold text-purple-700 font-mono block">0</span>
                    <span className="text-[9px] text-slate-400 font-bold">INCIDENT</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Flight Safety Telemetry</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">Step 3</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP-BY-STEP ORDERING GUIDE WALKTHROUGH (CORE REQUEST) ──────────── */}
      <section className="max-w-6xl mx-auto px-6 mb-16">
        <div className="bg-gradient-to-br from-white via-purple-50/40 to-blue-50/30 border-2 border-purple-200/80 rounded-3xl p-6 sm:p-10 shadow-lg">
          <div className="max-w-3xl mb-8">
            <div className="inline-flex items-center gap-2 bg-[#3b0080] text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>STEP-BY-STEP MANUAL</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#171222] tracking-tight mb-3">
              How to Place a Drone Courier Delivery Order
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              IndoWings enables instant autonomous aerial transit across Delhi NCR in 6 clear steps. Follow this guide to prepare your package, book a flight corridor, and receive contactless delivery.
            </p>
          </div>

          {/* 6 Step Interactive Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  01
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#3b0080]" />
                  <span>Choose Corridors</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select predefined verified hubs (Noida Sec 62, Connaught Place, Cyber City Gurugram, Faridabad) or type any residential/office location. OpenStreetMap geocodes your precise GPS coordinates automatically.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Tip: Use "Use Saved Address" for 1-click fill
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  02
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#3b0080]" />
                  <span>Package Type & Weight</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose package category (Medical Supplies, Critical Documents, Electronics, Lab Samples) and enter weight (up to 5.0 kg DGCA limit). Our algorithm selects the optimal drone model (Cyberone Lite, Max, or Pro).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Standard payload capacity: 0.5 kg to 5.0 kg
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  03
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#3b0080]" />
                  <span>Real-Time Fare & ETA</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The system calculates true aerial distance via GPS coordinates (~14.8 km) and shows exact base fare (₹149 + ₹15/km + ₹25/kg) with guaranteed 18 to 24 minute transit window.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Transparent: Zero hidden surge charges
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  04
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#3b0080]" />
                  <span>Payment Gateway or COD</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pay securely via Razorpay (UPI QR, Google Pay, PhonePe, Cards, NetBanking) or choose Cash on Delivery (COD) to pay upon safe package drop. Automated invoice and receipt is immediately issued.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Instant Razorpay checkout modal supported
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  05
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#3b0080]" />
                  <span>Live Radar Telemetry</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upon dispatch, you receive an Air Tracking ID (e.g. <code>ORD-892140</code>). Visit <code>/track</code> to watch your drone's live GPS coordinates, altitude (120m AGL), airspeed (65 km/h), and battery percentage.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                Live flight updates synced every 4 seconds
              </div>
            </div>

            {/* Step 6 */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-bold text-sm font-mono mb-3">
                  06
                </div>
                <h3 className="text-base font-bold text-[#171222] mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3b0080]" />
                  <span>Terrace Winch Drop & OTP</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The drone hovers safely at 15m above your clear 3×3m terrace. A motorized winch tether gently lowers the package to ground level. Enter the 4-digit SMS OTP to release and complete delivery.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-semibold">
                100% contactless and DGCA certified
              </div>
            </div>
          </div>

          {/* Direct Action Banner inside Guide */}
          <div className="mt-8 pt-6 border-t border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3b0080] text-white flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#171222]">Ready to dispatch your first aerial delivery?</p>
                <p className="text-xs text-slate-500">Average courier dispatch time: 4 minutes from order submission.</p>
              </div>
            </div>
            <button
              onClick={() => { onNavigate('order'); window.history.pushState({}, '', '/order'); }}
              className="bg-[#3b0080] hover:bg-[#260052] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0">
              <span>Go to Order Dispatch Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── DOCUMENTATION CATEGORY FILTER & SEARCH BAR ──────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Docs' },
              { id: 'ordering', label: 'Drone Delivery' },
              { id: 'platform', label: 'Platform & Architecture' },
              { id: 'gcs', label: 'GCS Workstation' },
              { id: 'admin', label: 'Admin & Dispatch' },
              { id: 'safety', label: 'Safety & DGCA' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#3b0080] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-200 hover:text-[#3b0080]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] transition-all shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* ── 6 CORE DOCUMENTATION CARDS (Exact Screenshot 3 Layout) ───────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map(card => {
            const Icon = card.icon;
            return (
              <div 
                key={card.id}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  {/* Card Tag Pill */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.tagColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${card.tagColor}`}>
                      {card.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-[#171222] mb-3 group-hover:text-[#3b0080] transition-colors leading-snug">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                    {card.desc}
                  </p>
                </div>

                {/* Footer Link */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (card.targetPage) {
                        onNavigate(card.targetPage);
                        window.history.pushState({}, '', `/${card.targetPage}`);
                      } else if (card.id === 'doc-ordering') {
                        onNavigate('order');
                        window.history.pushState({}, '', '/order');
                      } else {
                        onNavigate('support');
                        window.history.pushState({}, '', '/support?tab=guide');
                      }
                    }}
                    className="text-xs font-bold text-[#3b0080] hover:text-[#250052] flex items-center gap-1.5 transition-colors cursor-pointer group-hover:translate-x-1 duration-150"
                  >
                    <span>{card.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
