import React, { useState, useEffect, useRef } from 'react';
import { Package, Navigation, ArrowRight, CheckCircle2, MapPin, Zap, Shield, Clock, Star, ChevronRight, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { InteractiveDrone } from './InteractiveDrone';

interface HeroProps {
  onOpenCommandCenter: () => void;
  onOpenDemoBooking: () => void;
  onNavigate?: (page: string) => void;
}

/* ─── DATA ────────────────────────────────────────────────────────────────── */
const STATS = [
  { value: '24', unit: 'min', label: 'Avg. Delivery Time' },
  { value: '65', unit: 'km/h', label: 'Cruise Speed' },
  { value: '5.0', unit: 'kg', label: 'Max Payload' },
  { value: '99.2', unit: '%', label: 'On-Time Rate' },
];

const PACKAGE_TYPES = [
  { name: 'Medicine & Lab Samples' },
  { name: 'Documents & Contracts' },
  { name: 'Food & Hot Parcels' },
  { name: 'Electronics & Spares' },
  { name: 'Lab & Medical Kits' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: MapPin, title: 'Book Your Delivery', desc: 'Enter pickup & drop address in Delhi-NCR. Choose package type, weight & schedule instantly.', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
  { step: '02', icon: Zap, title: 'Instant UAV Dispatch', desc: 'Nearest Cyberone drone is assigned. Autonomous pre-flight safety check completes in 90 seconds.', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  { step: '03', icon: Navigation, title: 'Real-Time Tracking', desc: 'Track live flight on your screen. SMS alert sent 3 minutes before the drone reaches your drop zone.', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  { step: '04', icon: Package, title: 'Contactless Delivery', desc: 'Drone hovers at 12m, winches package to ground. Digital receipt sent immediately upon delivery.', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
];

const FEATURES = [
  { icon: Clock, title: 'Under 24 Minutes', desc: 'Faster than any road vehicle across all Delhi-NCR air corridors.' },
  { icon: Shield, title: 'DGCA Certified', desc: 'Fully compliant under India Drone Rules 2021 — licensed BVLOS operations.' },
  { icon: Navigation, title: 'Live Telemetry', desc: 'GPS tracking with weather sensor, LiDAR obstacle avoidance & auto-hold.' },
  { icon: Zap, title: 'COD + Online Pay', desc: 'Razorpay UPI, Debit/Credit Cards, or Cash on Delivery — any preference.' },
];

const COVERAGE_ZONES = [
  { zone: 'Noida Sector 62', type: 'UAV Primary Hub' },
  { zone: 'Connaught Place', type: 'Central Drop Zone' },
  { zone: 'AIIMS New Delhi', type: 'Medical Priority Port' },
  { zone: 'Cyber City Gurugram', type: 'Tech Corridor Hub' },
  { zone: 'Dwarka Sector 21', type: 'Residential Hub' },
  { zone: 'Greater Noida', type: 'Express Zone' },
];

/* ─── COMPONENT ──────────────────────────────────────────────────────────── */
export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const [activePkg, setActivePkg] = useState(0);
  const [liveCount, setLiveCount] = useState(12);
  const [statsCounted, setStatsCounted] = useState(false);
  const [displayStats, setDisplayStats] = useState(STATS.map(() => 0));
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const statsRef = useRef<HTMLDivElement>(null);

  // Cycle packages
  useEffect(() => {
    const t = setInterval(() => setActivePkg(p => (p + 1) % PACKAGE_TYPES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Random live drone count
  useEffect(() => {
    const t = setInterval(() => setLiveCount(n => Math.max(8, Math.min(20, n + (Math.random() > 0.5 ? 1 : -1)))), 6000);
    return () => clearInterval(t);
  }, []);

  const [analytics, setAnalytics] = useState<any>(null);
  const [latestOrder, setLatestOrder] = useState<any>(null);
  const [liveOrder, setLiveOrder] = useState<any>(null); // real in-flight order

  // Fetch real analytics + latest order + live in-flight order from backend
  useEffect(() => {
    apiClient.getStats().then(setAnalytics).catch(() => {});
    apiClient.getOrders().then(orders => {
      const inFlight = orders
        .filter((order: any) => ['in-flight', 'taking-off'].includes(order.status))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (inFlight.length) setLiveOrder(inFlight[0]);
      const delivered = orders
        .filter((order: any) => order.status === 'delivered')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (delivered.length) setLatestOrder(delivered[0]);
    }).catch(() => {});
  }, []);

  // The Fleet API does not expose customer feedback yet.
  useEffect(() => {
    setReviews([]);
    setReviewsLoading(false);
  }, []);

  // Count-up stats
  useEffect(() => {
    if (!statsRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !statsCounted) {
        setStatsCounted(true);
        STATS.forEach((stat, i) => {
          const target = parseFloat(stat.value);
          const duration = 1200;
          const steps = 50;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            setDisplayStats(prev => { const n = [...prev]; n[i] = current; return n; });
            if (current >= target) clearInterval(timer);
          }, duration / steps);
        });
      }
    }, { threshold: 0.5 });
    observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [statsCounted]);

  const formatStat = (val: number, orig: string) => {
    if (orig.includes('.')) return val.toFixed(1);
    return Math.round(val).toString();
  };

  const go = (page: string, url: string) => {
    onNavigate?.(page);
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          HERO
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden flex items-center" style={{ background: 'linear-gradient(135deg, #06010f 0%, #0d0520 45%, #10062a 100%)' }}>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(167,139,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 w-full pt-6 pb-10 sm:pt-8 sm:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-16 items-center">

            {/* ── Left ── */}
            <div className="space-y-8">
              {/* Live badge — only shown when real deliveries exist */}
              {analytics && analytics.deliveredOrders > 0 && (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{analytics.deliveredOrders} deliveries completed · {analytics.inFlightOrders || 0} flights active</span>
                </div>
              )}

              {/* Eyebrow */}
              <p className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-purple-400">
                India&apos;s Autonomous Drone Delivery Network
              </p>

              {/* Headline */}
              <h1 className="text-[42px] sm:text-[54px] lg:text-[62px] font-black leading-[1.05] tracking-tight text-white">
                Deliver Anything,{' '}
                <span className="relative">
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #c084fc, #818cf8)' }}>
                    Anywhere in NCR
                  </span>
                </span>
                <br />
                <span className="text-white/80 text-[38px] sm:text-[46px] lg:text-[52px]">— Under 24 Minutes.</span>
              </h1>

              {/* Body */}
              <p className="text-base sm:text-lg text-white/60 max-w-lg leading-relaxed">
                IndoWings Cyberone autonomous UAVs fly at 65 km/h above Delhi-NCR traffic — delivering medicine, documents, food and parcels to your rooftop via precision Kevlar winch tether. Contactless. Certified. Instant.
              </p>

              {/* Package ticker */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/30 font-medium shrink-0">Now delivering:</span>
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <span className="text-sm font-bold text-white">{PACKAGE_TYPES[activePkg].name}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => go('order', '/order')}
                  className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-black text-sm text-white shadow-xl shadow-purple-900/40 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
                >
                  <span>Book Drone Delivery</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => go('track', '/track')}
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-purple-300" />
                  <span>Track My Order</span>
                </button>
              </div>

              {/* Trust micro-badges */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-white/40">
                {['DGCA Certified UAVs', 'Razorpay Secured', 'Live SMS Tracking', 'COD Available'].map(b => (
                  <span key={b} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right — Floating Cyber Pilot Visual ── */}
            <div className="hidden lg:flex flex-col items-center justify-center">
              <InteractiveDrone onOrderClick={() => go('order', '/order')} />
            </div>

          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS BAR — Count-up animation
         ══════════════════════════════════════════════════════════════════════ */}
      <section ref={statsRef} style={{ background: 'linear-gradient(90deg, #2e0068, #3b0080, #2e0068)' }} className="py-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-white/10">
            {STATS.map((s, i) => (
              <div key={s.label} className="text-center py-2 px-4">
                <p className="text-3xl sm:text-[44px] font-black text-white tabular-nums leading-none">
                  {formatStat(displayStats[i], s.value)}
                  <span className="text-lg sm:text-2xl font-bold text-purple-300 ml-1">{s.unit}</span>
                </p>
                <p className="text-xs font-semibold text-white/50 mt-2 tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-[#f9f7fd]" id="how-it-works">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600 mb-3">Simple 4-Step Process</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#171222] tracking-tight">
              Booking to doorstep delivery
            </h2>
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mx-auto mt-5" />
            <p className="text-slate-500 mt-6 text-base max-w-xl mx-auto leading-relaxed">
              Our fully autonomous system handles everything — from the moment you book to the contactless tether drop at your rooftop. Zero human intervention required mid-flight.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step}
                className={`relative bg-white rounded-3xl p-7 border ${step.border} shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group`}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:flex absolute top-12 right-[-18px] z-10 text-slate-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${step.color} transition-transform group-hover:scale-110`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-slate-300 tracking-[0.15em] uppercase">{step.step}</span>
                <h3 className="text-lg font-black text-[#171222] mt-1 mb-2.5 leading-tight">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES — Split layout
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white" id="features">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div className="space-y-7">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600 mb-3">Why IndoWings</p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#171222] leading-tight">
                  Built for speed, safety and Indian skies.
                </h2>
                <div className="w-14 h-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mt-5" />
              </div>
              <p className="text-slate-500 text-base leading-relaxed">
                Our Cyberone Pro UAVs are purpose-engineered for last-mile urban delivery in dense Indian metros — overcoming the traffic, weather and building density that paralyses ground vehicles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FEATURES.map(f => (
                  <div key={f.title} className="group flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:border-purple-200 group-hover:bg-purple-100 text-slate-500 group-hover:text-[#3b0080] flex items-center justify-center shrink-0 transition-all shadow-sm">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#171222]">{f.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => go('order', '/order')}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-black text-sm text-white shadow-xl shadow-purple-900/20 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #4f46e5)' }}>
                <Package className="w-4 h-4" />
                Book Your First Delivery
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right — Drone spec card */}
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200">
              <div className="px-7 py-6" style={{ background: 'linear-gradient(135deg, #06010f, #0d0520)' }}>
                <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Navigation className="w-7 h-7 text-purple-400" />
                </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Cyberone Pro UAV</h3>
                    <p className="text-xs text-white/40 mt-0.5">IndoWings Fleet · v3.4.4 Stable</p>
                  </div>
                  <span className="ml-auto text-[9px] font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                    ● ACTIVE
                  </span>
                </div>
                {[
                  ['Max Payload', '5.0 kg'],
                  ['Cruise Speed', '65 km/h'],
                  ['Altitude', '90 m AGL'],
                  ['Range', '25 km'],
                  ['Winch System', 'Kevlar Tether Drop'],
                  ['Obstacle Avoidance', 'LiDAR + Vision AI'],
                  ['Weather Rating', 'IP55 · Wind ≤35 km/h'],
                  ['Certification', 'DGCA BVLOS Class'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-white/[0.06] last:border-0">
                    <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                    <span className="text-sm font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-5 bg-slate-50">
                <button onClick={() => go('order', '/order')}
                  className="w-full py-3.5 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #4f46e5)' }}>
                  Book Now — Instant Dispatch ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          COVERAGE ZONES
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-[#f9f7fd]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600 mb-3">Coverage Area</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#171222]">Delhi-NCR Air Corridors</h2>
            <div className="w-14 h-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mx-auto mt-5" />
            <p className="text-slate-500 text-base max-w-md mx-auto mt-5 leading-relaxed">
              Pre-certified autonomous flight corridors across Delhi, Noida, Gurugram and Greater Noida.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {COVERAGE_ZONES.map(z => (
              <div key={z.zone} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center hover:border-purple-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 flex items-center justify-center mx-auto mb-3 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="text-xs font-black text-[#171222] leading-snug">{z.zone}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{z.type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          REAL CUSTOMER REVIEWS
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600 mb-3">Verified Reviews</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#171222]">What our customers say</h2>
            <div className="w-14 h-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mx-auto mt-5" />
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((t, i) => (
                <div key={t.id || i} className="bg-slate-50 rounded-3xl p-7 border border-slate-100 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex gap-1 mb-5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= (t.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">"{t.message}"</p>
                  <div className="flex items-center gap-3 mt-6">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6d28d9, #4f46e5)' }}>
                      {(t.user_name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#171222]">{t.user_name || 'IndoWings Customer'}</p>
                      <p className="text-xs text-slate-400">{t.drone_name ? `Delivered via ${t.drone_name}` : 'Verified Customer'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">No reviews yet — be the first to share your experience!</p>
              <button onClick={() => go('order', '/order')}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #4f46e5)' }}>
                <Package className="w-4 h-4" />
                Book Your First Delivery
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #06010f 0%, #1a0640 50%, #06010f 100%)' }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(167,139,250,1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live fleet operational · Delhi-NCR · {liveCount} drones active
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight max-w-3xl mx-auto">
            Ready to experience the future of delivery?
          </h2>
          <p className="text-white/50 text-base max-w-lg mx-auto leading-relaxed">
            Join thousands of Delhi-NCR residents using IndoWings for same-day medicine, document and parcel delivery — in under 24 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button onClick={() => go('order', '/order')}
              className="group flex items-center gap-2.5 px-9 py-4 rounded-xl font-black text-sm text-[#3b0080] bg-white hover:bg-slate-50 shadow-2xl transition-all active:scale-95">
              <Package className="w-5 h-5" />
              Book Drone Delivery Now
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => go('track', '/track')}
              className="flex items-center gap-2.5 px-9 py-4 rounded-xl font-bold text-sm text-white border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95">
              <Navigation className="w-4 h-4" />
              Track Existing Order
            </button>
          </div>
        </div>
      </section>
    </>
  );
};
