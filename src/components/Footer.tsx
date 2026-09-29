import React, { useState } from 'react';
import { ArrowRight, Shield, Check, Send } from 'lucide-react';

interface FooterProps {
  onNavigate?: (page: string) => void;
  onOpenFeedback?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenFeedback }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setEmail('');
      }, 4000);
    }
  };

  const navTo = (page: string, url: string, hash?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) onNavigate(page);
    window.history.pushState({}, '', hash ? `${url}#${hash}` : url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#080b11] text-slate-300 pt-16 pb-10 px-4 sm:px-8 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] border-t border-white/[0.06]">
      {/* Subtle Flytbase-style dot matrix background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Atmospheric aerospace glows */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[250px] bg-purple-600/[0.08] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[250px] bg-indigo-600/[0.07] blur-[110px] rounded-full pointer-events-none" />

      {/* GIANT FLYTBASE-STYLE WATERMARK
          Interwoven with the footer so content sits right over it */}
      <div className="absolute bottom-2 sm:bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none flex justify-center items-end z-0">
        <span
          className="font-black tracking-tighter leading-none whitespace-nowrap text-transparent font-['Space_Grotesk',sans-serif]"
          style={{
            fontSize: 'clamp(70px, 17vw, 240px)',
            WebkitTextStroke: '1px rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 75%, transparent 100%)',
            WebkitBackgroundClip: 'text',
            letterSpacing: '-0.04em',
            transform: 'translateY(14%)',
          }}
        >
          indowings
        </span>
      </div>

      {/* Relative Content Container */}
      <div className="relative z-10 max-w-[1360px] mx-auto">
        {/* Top bar: Brand + Newsletter / Corridor Alerts */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-12 border-b border-white/[0.07]">
          <div className="max-w-md">
            <a href="/" onClick={navTo('home', '/')} className="inline-flex items-center gap-3">
              <img
                src="/indowings-logo-white.svg"
                alt="IndoWings"
                className="h-7 w-auto object-contain"
              />
            </a>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              India&apos;s leading autonomous UAV logistics &amp; BVLOS corridor platform. Precision delivery, defense-grade telemetry, and DGCA certified airspace control.
            </p>
          </div>

          {/* FlytBase style Work Email / Corridor Alerts Input */}
          <div className="w-full lg:w-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Stay updated on new flight corridors
            </p>
            <form onSubmit={handleSubscribe} className="flex items-center max-w-md bg-white/[0.04] border border-white/10 rounded-xl p-1.5 focus-within:border-purple-500/50 transition-colors">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your work email"
                required
                className="bg-transparent text-sm text-white px-3.5 py-2 w-full focus:outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md active:scale-95"
              >
                {subscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <span>Notify Me</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Links Grid — gracefully floating over the giant watermark */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 py-12">
          {/* Column 1: Delivery Operations */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/90 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Delivery
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="/order" onClick={navTo('order', '/order')} className="hover:text-white transition-colors">
                  Book Drone Delivery
                </a>
              </li>
              <li>
                <a href="/track" onClick={navTo('track', '/track')} className="hover:text-white transition-colors">
                  Live Flight Tracking
                </a>
              </li>
              <li>
                <a href="/profile?tab=orders" onClick={navTo('orders', '/profile?tab=orders')} className="hover:text-white transition-colors">
                  My Orders
                </a>
              </li>
              <li>
                <a href="/dispatch" onClick={navTo('dispatch', '/dispatch')} className="hover:text-purple-400 transition-colors">
                  Dispatch Board
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/90 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="/platform" onClick={navTo('platform', '/platform')} className="hover:text-white transition-colors">
                  How IndoWings Works
                </a>
              </li>
              <li>
                <a href="/gcs" onClick={navTo('gcs', '/gcs')} className="hover:text-white transition-colors">
                  IndoWings GCS
                </a>
              </li>
              <li>
                <a href="/command-center" onClick={navTo('command-center', '/command-center')} className="hover:text-white transition-colors">
                  Command Center
                </a>
              </li>
              <li>
                <a href="/downloads" onClick={navTo('downloads', '/downloads')} className="hover:text-white transition-colors">
                  Telemetry Downloads
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/90 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Resources
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="/docs" onClick={navTo('docs', '/docs')} className="hover:text-white transition-colors">
                  API &amp; Docs
                </a>
              </li>
              <li>
                <a href="/feedback" onClick={navTo('feedback', '/feedback')} className="hover:text-white transition-colors">
                  Customer Reviews
                </a>
              </li>
              <li>
                <a href="/support" onClick={navTo('support', '/support')} className="hover:text-white transition-colors">
                  24/7 Expert Support
                </a>
              </li>
              <li>
                <a href="/support?tab=fix" onClick={navTo('support', '/support?tab=fix')} className="hover:text-white transition-colors">
                  Fix &amp; Troubleshoot
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/90 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Company
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="/company" onClick={navTo('company', '/company')} className="hover:text-white transition-colors">
                  About IndoWings
                </a>
              </li>
              <li>
                <a href="mailto:support@indowings.com" className="text-purple-300 hover:text-purple-200 transition-colors">
                  support@indowings.com
                </a>
              </li>
              <li>
                <span className="inline-block mt-2 text-xs text-slate-500">
                  Noida Hub · Delhi NCR, India
                </span>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal & Compliance */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-white/90 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Compliance
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {[
                { label: 'Privacy Policy', hash: 'privacy' },
                { label: 'Terms of Use', hash: 'terms' },
                { label: 'Security Disclosure', hash: 'security' },
                { label: 'Data Protection', hash: 'data-protection' },
              ].map(item => (
                <li key={item.hash}>
                  <a
                    href={`/legal#${item.hash}`}
                    onClick={navTo('legal', '/legal', item.hash)}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-8 pb-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-4">
            <span>&copy; {new Date().getFullYear()} IndoWings Technologies.</span>
            <span className="hidden sm:inline text-white/20">|</span>
            <span className="text-slate-400">Make in India · DGCA BVLOS Certified</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Network Online
            </span>
            <span className="text-white/20">·</span>
            <span>256-bit Encrypted Telemetry</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
