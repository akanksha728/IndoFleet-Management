import React, { useState, useEffect } from 'react';
import { 
  Phone, MessageSquare, ShieldCheck, CheckCircle2, AlertTriangle, 
  HelpCircle, ChevronDown, ChevronUp, Search, Send, Clock, User, 
  Mail, Package, Truck, Navigation, FileText, ArrowRight, ExternalLink,
  Sparkles, Check, Headphones, MessageCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { DeliveryUser } from '../components/AuthModal';
import { API_BASE_URL } from '../config/api';

interface SupportPageProps {
  onNavigate: (page: string) => void;
  currentUser: DeliveryUser | null;
  initialTab?: 'expert' | 'guide' | 'fix';
}

export const SupportPage: React.FC<SupportPageProps> = ({ onNavigate, currentUser, initialTab = 'expert' }) => {
  const [activeTab, setActiveTab] = useState<'expert' | 'guide' | 'fix'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Talk to Expert Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [category, setCategory] = useState('Terrace Landing Feasibility');
  const [preferredTime, setPreferredTime] = useState('Immediate Callback (15 mins)');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [formError, setFormError] = useState('');

  // Fix Guide Accordion State
  const [openFixId, setOpenFixId] = useState<string | null>('fix-1');
  const [fixCategoryFilter, setFixCategoryFilter] = useState('all');

  // Handle URL query param on mount or change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'expert' || tabParam === 'guide' || tabParam === 'fix') {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabSwitch = (tab: 'expert' | 'guide' | 'fix') => {
    setActiveTab(tab);
    window.history.pushState({}, '', `/support?tab=${tab}`);
  };

  const handleSubmitExpertRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() && !email.trim()) {
      setFormError('Please enter your mobile phone number or email address');
      return;
    }
    setIsSubmitting(true);
    setFormError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/support/expert-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Client',
          phone: phone.trim(),
          email: email.trim(),
          category,
          preferred_time: preferredTime,
          message: message.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      setSubmittedRequest(data.request);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FIX_ITEMS = [
    {
      id: 'fix-1',
      category: 'weather',
      title: 'Drone flight is showing "On Hold" — What happened and when will it resume?',
      summary: 'Automated meteorological hold triggered by DigitalSky wind or precipitation thresholds.',
      solution: `IndoWings autonomous UAVs are calibrated for maximum safety. If wind gusts exceed 35 km/h or active rainfall is detected along the flight corridor, the Command Center places the flight on "Weather Hold".
      
      • Automatic Resumption: The telemetry system polls live weather sensors every 3 minutes. As soon as the corridor clears, the drone automatically resumes cruising.
      • No Action Required: You will receive real-time SMS updates. Your package remains securely locked in the vibration-isolated cargo pod.
      • Emergency Reroute: If hold exceeds 20 minutes, Admin Dispatch reroutes via an alternate low-altitude green corridor.`,
      actionLabel: 'Check Live Flight Telemetry',
      actionPage: 'track'
    },
    {
      id: 'fix-2',
      category: 'gps',
      title: 'My building, flat or society is not showing up in search — How do I fix it?',
      summary: 'Quick guide to setting accurate coordinates using OpenStreetMap or GPS Auto-Detect.',
      solution: `If your exact building number or newly developed society does not appear in the address dropdown:
      
      1. Use "GPS Auto-Detect": Tap the GPS icon inside the Departure/Drop field on your mobile phone to fetch precise satellite coordinates.
      2. Choose the Nearest Verified Hub: Select a nearby hub (e.g. Noida Sector 62 Hub or CP Metro), and write your exact flat/tower number in the "Delivery Notes" field.
      3. Landmark Search: Search by major nearby landmarks (e.g. "Near Fortis Hospital Noida" or "Cyber Hub Gate 3") instead of private society names.`,
      actionLabel: 'Go to Order Page',
      actionPage: 'order'
    },
    {
      id: 'fix-3',
      category: 'refund',
      title: 'Order was cancelled or delivery could not be completed — When will I get my refund?',
      summary: 'Automated Razorpay instant refund settlement timeline and status.',
      solution: `If an order is cancelled before takeoff, or if the drone cannot find a safe landing zone and aborts delivery back to the hub:
      
      • Online UPI / Cards: Razorpay triggers an automated refund instantly. UPI refunds reflect in 15 to 30 minutes, while debit/credit cards take 24–48 hours depending on your bank.
      • Cash on Delivery (COD): No payment was collected, so zero deduction occurred.
      • Check Refund Status: You can view transaction status in your Profile under "My Orders & History" or share your Order ID with our expert desk.`,
      actionLabel: 'View My Orders & History',
      actionPage: 'orders'
    },
    {
      id: 'fix-4',
      category: 'landing',
      title: 'The drone is hovering above my terrace but not lowering the package — What should I do?',
      summary: 'Sensory obstacle clearance protocol for precision winch tether drop.',
      solution: `IndoWings Cyberone UAVs descend to 12 meters altitude and lower your package via a precision Kevlar winch wire. If the drone hovers without lowering:
      
      1. Obstacle Detection: Downward LiDAR sensors may have spotted loose clothing lines, pets, or people standing directly under the drop point.
      2. Keep Clear: Ensure everyone stays at least 3 meters away from the open drop zone.
      3. Wait 60 Seconds: Once the landing zone is visually unobstructed, the winch automatically descends and soft-releases the payload onto the ground.`,
      actionLabel: 'Talk to Flight Engineer',
      tabSwitch: 'expert'
    },
    {
      id: 'fix-5',
      category: 'rules',
      title: 'Can I change the drop destination address while the UAV is already airborne?',
      summary: 'DGCA airspace geo-fencing regulations and mid-air flight route constraints.',
      solution: `Under DGCA DigitalSky flight clearance regulations, autonomous commercial UAV flight paths are pre-locked in an active green air corridor.
      
      • Mid-Air Destination Change: Prohibited once the drone has taken off, as flight corridors are pre-coordinated with regional airspace grids.
      • Emergency Return: If you urgently need to abort the delivery, you or the Admin can trigger "Hold in Air" or "Recall to Base" from the Track Order page or Dispatch Board.`,
      actionLabel: 'Track Current Flight',
      actionPage: 'track'
    }
  ];

  const filteredFixes = FIX_ITEMS.filter(item => {
    const matchesCategory = fixCategoryFilter === 'all' || item.category === fixCategoryFilter;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.solution.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8f6fc]">
      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <section 
        className="relative text-white pt-16 pb-24 px-6 overflow-hidden text-center"
        style={{ background: 'linear-gradient(135deg, #1b073a 0%, #2b114d 50%, #15062a 100%)' }}>
        <div 
          className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #fff 1px, transparent 1px)', backgroundSize: '36px 36px' }}
        />
        
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-bold text-purple-200 mb-4 shadow-sm">
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>IndoWings Flight Operations & Knowledge Center</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            How can our flight desk help you today?
          </h1>
          <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
            Connect directly with Flight Operations Engineers, explore the Drone Delivery User Manual, or find instant self-serve fixes.
          </p>

          {/* Quick Search Input */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search issues, packaging rules, terrace safety, refunds..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-[#171222] placeholder-slate-400 text-sm font-medium shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-400/30 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 3 PRIMARY TABS BAR ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-20">
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xl flex items-center justify-between gap-1 sm:gap-2">
          {[
            { id: 'expert', label: 'Talk to Expert', icon: Phone, badge: 'Live Engineers' },
            { id: 'guide', label: 'Customer Guide', icon: FileText, badge: 'User Manual' },
            { id: 'fix', label: 'Fix Guide & Help', icon: HelpCircle, badge: 'Self-Serve' },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => handleTabSwitch(id as any)}
              className={`flex-1 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === id
                  ? 'bg-[#3b0080] text-white shadow-md shadow-purple-900/20'
                  : 'text-slate-600 hover:text-[#3b0080] hover:bg-purple-50/60'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono hidden md:inline ${
                activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        
        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: TALK TO EXPERT (LIVE CONSULTATION DESK)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'expert' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
            {/* Left: Consultation Request Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="mb-6">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  Direct Flight Operations Desk
                </span>
                <h2 className="text-2xl font-black text-[#171222] mt-2 tracking-tight">
                  Consult a Drone Logistics Engineer
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Have specific rooftop landing questions, bulk pharmaceutical shipments, or corridor setup needs? Our engineers call you back directly.
                </p>
              </div>

              {submittedRequest ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/20">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">Consultation Request Confirmed!</h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Reference: <strong className="font-mono">{submittedRequest.id}</strong> • Assigned to Senior Operations Lead
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 text-left text-xs space-y-1.5 text-slate-700">
                    <p><strong>Client Name:</strong> {submittedRequest.name}</p>
                    <p><strong>Target Phone:</strong> {submittedRequest.phone}</p>
                    <p><strong>Topic:</strong> {submittedRequest.category}</p>
                    <p><strong>Expected Callback:</strong> {submittedRequest.preferred_time}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Need instant communication right now? Tap the WhatsApp button on the right to chat live!
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedRequest(null)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitExpertRequest} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Puneet Kushwaha"
                          required
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Mobile Phone (For Callback) *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          required
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Consultation Topic
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 bg-white">
                        <option value="Terrace Landing Feasibility">Terrace / Rooftop Landing Feasibility</option>
                        <option value="Bulk Medical & Industrial Courier">Bulk Medical & Industrial Courier</option>
                        <option value="Active Order / Corridor Hold Support">Active Order / Corridor Hold Support</option>
                        <option value="Custom UAV Enterprise Fleet">Custom UAV Enterprise Fleet Inquiry</option>
                        <option value="General Drone Flight Rules">General DGCA & Drone Rules Query</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Preferred Callback Window
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        'Immediate Callback (15 mins)',
                        'Within 1 Hour',
                        'Evening (5 PM - 8 PM)'
                      ].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPreferredTime(t)}
                          className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition-all text-center cursor-pointer ${
                            preferredTime === t
                              ? 'bg-purple-50 text-[#3b0080] border-[#3b0080] ring-1 ring-[#3b0080]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Specific Notes or Coordinates (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="e.g. My rooftop has high trees nearby; want to confirm tether winch clearance for 3kg medical box..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3b0080] focus:ring-2 focus:ring-purple-100 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#3b0080] hover:bg-[#2c0060] text-white rounded-xl text-sm font-bold shadow-md shadow-purple-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        <span>Request Engineer Callback Now</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right: Direct Contact & Emergency Action Hub */}
            <div className="lg:col-span-5 space-y-5">
              {/* WhatsApp Instant Desk */}
              <div className="bg-gradient-to-br from-emerald-900 via-[#0b291a] to-emerald-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      Live Chat Dispatch
                    </span>
                    <h3 className="text-lg font-bold">Chat on WhatsApp</h3>
                  </div>
                </div>
                <p className="text-xs text-white/80 leading-relaxed mb-5">
                  Skip the phone queue! Send your location pin or delivery question directly to our Active Flight Control room via WhatsApp.
                </p>
                <a
                  href={`https://wa.me/919876543210?text=${encodeURIComponent('Hi IndoWings Operations Desk, I need assistance with drone delivery and flight corridors.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg">
                  <MessageCircle className="w-4 h-4" />
                  <span>Start WhatsApp Conversation</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Direct Toll-Free Operations Hotline */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3b0080] flex items-center justify-center">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#171222]">24/7 Operations Hotline</h4>
                    <p className="text-xs text-slate-400">Emergency & Dispatch Control</p>
                  </div>
                </div>
                <p className="text-xl font-black text-[#3b0080] font-mono tracking-tight">
                  +91 (120) 456-7890
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Active during all scheduled Delhi-NCR flight corridor hours.
                </p>
              </div>

              {/* Operations Readiness Guarantee */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-3xl p-6 text-xs text-slate-600 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-[#3b0080]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>DGCA Certified Flight Engineers</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  All IndoWings flight advisors hold Remote Pilot Licences (RPL) certified under DGCA Drone Rules 2021, ensuring safety-critical aerial compliance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: CUSTOMER GUIDE (DRONE DELIVERY USER MANUAL)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'guide' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Guide Header Banner */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="max-w-2xl">
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  IndoWings Standard Operating Procedure (SOP)
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#171222] mt-3 tracking-tight">
                  Autonomous UAV Delivery: Customer Guide
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Learn how IndoWings delivers cargo in under 24 minutes, packaging limits, and how to prepare your terrace for safe, contactless tether drop.
                </p>
              </div>
            </div>

            {/* 4 In-Depth Visual Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Module 1: Packaging Guidelines */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Packaging & Weight Rules</h3>
                    <p className="text-xs text-slate-400">Cyberone Pro Payload Specifications</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500 font-medium">Maximum Flight Payload:</span>
                    <strong className="text-purple-900 font-bold">5.0 kg Max</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-slate-500 font-medium">Standard Box Dimension:</span>
                    <strong className="text-slate-800 font-mono">30 × 25 × 20 cm</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Weather Protection:</span>
                    <strong className="text-emerald-700 font-bold">Waterproof Seal Required</strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">Allowed vs Prohibited Cargo:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                      <strong className="block text-emerald-800 font-bold">✓ ALLOWED:</strong>
                      <p>• Medicines & Lab Samples</p>
                      <p>• Documents & Contracts</p>
                      <p>• Electronics & Small Spares</p>
                      <p>• Food & Parcel Courier</p>
                    </div>
                    <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                      <strong className="block text-rose-800 font-bold">✗ PROHIBITED:</strong>
                      <p>• Flammable liquids / gas</p>
                      <p>• Loose lithium batteries</p>
                      <p>• Unpadded glass items</p>
                      <p>• Weight &gt; 5 kg</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module 2: Drop Zone & Rooftop Safety */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center font-black">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Drop Zone Safety (The 3×3m Rule)</h3>
                    <p className="text-xs text-slate-400">Terrace & Open Ground Clearance</p>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs space-y-2">
                  <p className="font-bold text-[#3b0080]">
                    🎯 Precision Hover & Winch Delivery:
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    The UAV does NOT land on your rooftop tiles. It hovers stably at <strong>12 meters altitude</strong> and smoothly winches down the package via a high-tensile Kevlar tether.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Clear 3×3m Area:</strong> Remove potted plants, drying clothes, or loose outdoor furniture.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Overhead Clearance:</strong> Ensure there are no overhead cables or tree branches directly above the spot.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Safe Distance:</strong> Stay 2 to 3 meters back while the cable lowers the cargo.</span>
                  </li>
                </ul>
              </div>

              {/* Module 3: 4-Stage Flight Lifecycle */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Autonomous Flight Stages</h3>
                    <p className="text-xs text-slate-400">What happens during the 24-minute flight</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#3b0080] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                    <div>
                      <strong className="text-[#171222]">Hub Dispatch & Vertical Climb</strong>
                      <p className="text-[11px] text-slate-500">Autonomous vertical ascent to 90m cruising altitude.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#3b0080] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    <div>
                      <strong className="text-[#171222]">Green Corridor Cruise @ 65 km/h</strong>
                      <p className="text-[11px] text-slate-500">Direct straight-line transit above city street traffic.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-[#3b0080] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    <div>
                      <strong className="text-[#171222]">Waypoint Descent & Tether Drop</strong>
                      <p className="text-[11px] text-slate-500">Precision GPS positioning + automated winch soft landing.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Module 4: Secure Handover & OTP Verification */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                    4
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#171222]">Secure Handover & Proof</h3>
                    <p className="text-xs text-slate-400">Verifying receipt & unhooking</p>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-amber-900">
                    🔐 Contactless Delivery Protocol:
                  </p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Once the payload touches down, the mechanical clamp releases automatically. The cable retracts smoothly up to the drone, and you receive an instant digital receipt.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                  <p>• <strong>SMS Arrival Notification:</strong> Sent 3 minutes before drone arrival.</p>
                  <p>• <strong>Live Camera Confirmation:</strong> Downward sensor records touchdown timestamp.</p>
                  <p>• <strong>COD / Payment:</strong> Pay online prior to dispatch or pay on arrival via dynamic UPI QR.</p>
                </div>
              </div>
            </div>

            {/* Quick Action Button to Place Order */}
            <div className="p-6 bg-gradient-to-r from-purple-900 to-[#3b0080] rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <h3 className="text-lg font-bold">Ready to dispatch your first aerial parcel?</h3>
                <p className="text-xs text-white/70 mt-0.5">Instant booking across Delhi-NCR autonomous air corridors.</p>
              </div>
              <button
                onClick={() => onNavigate('order')}
                className="px-6 py-3 bg-white text-[#3b0080] font-black rounded-xl text-xs sm:text-sm hover:bg-slate-100 transition-all shrink-0 cursor-pointer shadow-md">
                Book Drone Delivery →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: FIX GUIDE (TROUBLESHOOTING & ISSUE RESOLUTION)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'fix' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Category Pills */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
              <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
                Instant Self-Serve Troubleshooting
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#171222] mt-2 tracking-tight">
                Fix Common Issues
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
                Resolve weather holds, coordinate pins, refund timelines, and delivery questions instantly without waiting in call queues.
              </p>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'All Issues' },
                  { id: 'weather', label: '🌧️ Weather & Holds' },
                  { id: 'gps', label: '📍 Address & GPS Pins' },
                  { id: 'refund', label: '💸 Refunds & Billing' },
                  { id: 'landing', label: '🎯 Rooftop & Winch' },
                  { id: 'rules', label: '🛡️ DGCA Airspace' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFixCategoryFilter(c.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      fixCategoryFilter === c.id
                        ? 'bg-[#3b0080] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-[#3b0080]'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-3">
              {filteredFixes.map(fix => {
                const isOpen = openFixId === fix.id;
                return (
                  <div 
                    key={fix.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isOpen ? 'border-[#3b0080]/60 ring-2 ring-purple-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <button
                      type="button"
                      onClick={() => setOpenFixId(isOpen ? null : fix.id)}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[#171222]">
                          {fix.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fix.summary}
                        </p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isOpen ? 'bg-purple-100 text-[#3b0080]' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 animate-in fade-in duration-150 space-y-4">
                        <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {fix.solution}
                        </div>

                        <div className="pt-2 flex items-center gap-3">
                          {fix.actionPage && (
                            <button
                              onClick={() => onNavigate(fix.actionPage!)}
                              className="px-4 py-2 bg-[#3b0080] hover:bg-[#2c0060] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                              <span>{fix.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {fix.tabSwitch && (
                            <button
                              onClick={() => handleTabSwitch(fix.tabSwitch as any)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                              <span>{fix.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFixes.length === 0 && (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                  No issues found matching your search. Tap <strong>Talk to Expert</strong> to ask our team directly.
                </div>
              )}
            </div>

            {/* Need More Help Box */}
            <div className="p-6 bg-white rounded-3xl border border-purple-100 text-center space-y-2">
              <h4 className="text-sm font-bold text-[#171222]">Still experiencing issues?</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Our operations control desk can manually override coordinates, inspect flight telemetry, or dispatch backup UAV frames.
              </p>
              <button
                onClick={() => handleTabSwitch('expert')}
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#3b0080] font-bold text-xs rounded-xl transition-all border border-purple-200 cursor-pointer">
                <Phone className="w-3.5 h-3.5" />
                <span>Talk to Flight Operations Desk</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
