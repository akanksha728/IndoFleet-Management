import React, { useState } from 'react';

type RoleTab = 'pilot' | 'admin' | 'manufacturer' | 'auditor';

interface DemoContent {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}

export const InteractiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RoleTab>('pilot');

  const tabContents: Record<RoleTab, DemoContent> = {
    pilot: {
      eyebrow: 'GCS COCKPIT',
      title: 'Pilot mission execution',
      description: 'Aircraft connection, live telemetry, mission planning, readiness checks, and controlled field workflows.',
      image: '/images/operator-start-mission.webp',
      alt: 'IndoWings pilot start mission profile with flight-hours and mission summary'
    },
    admin: {
      eyebrow: 'COMMAND CENTER',
      title: 'Enterprise administration',
      description: 'Organizations, users, role-based access, trusted devices, fleet visibility, mission approvals, and audit logs.',
      image: '/images/command-overview.webp',
      alt: 'IndoWings Command Center dashboard view with flight summary and alert review'
    },
    manufacturer: {
      eyebrow: 'VEHICLE LIFECYCLE',
      title: 'Manufacturer configuration',
      description: 'Vehicle profiles, firmware manager UI, readiness workflows, release coordination, and aircraft lifecycle support.',
      image: '/images/manufacturer-config.webp',
      alt: 'Manufacturer configuration view for vehicle profile setup'
    },
    auditor: {
      eyebrow: 'REVIEW WORKSPACE',
      title: 'Auditor View',
      description: 'Release history, mission evidence, access activity, and operational records are grouped for clear review.',
      image: '/images/mission-log-detail.webp',
      alt: 'IndoWings Command Center mission detail with review and evidence history'
    }
  };

  const current = tabContents[activeTab];

  return (
    <section className="pt-20 pb-20 sm:pt-24 sm:pb-24 bg-[#f8f7fc] text-[#171222] border-t border-[#3b0080]/10 scroll-mt-24" id="demo">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading with generous spacing and line break matching SkyGrid */}
        <div className="max-w-[760px] mb-8 sm:mb-10">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-3">
            Interactive Product Demo
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#171222] leading-[1.08] tracking-tight max-w-[620px]">
            Switch between operational roles and see how the platform adapts.
          </h2>
        </div>

        {/* Outer Workspace Card (.demo-workspace) with soft lavender tint and equal padding */}
        <div className="p-4 sm:p-5 rounded-xl border border-[#3b0080]/15 bg-[#f2ecf8] shadow-[0_16px_36px_rgba(31,18,45,0.06)]">
          {/* Tabs Row (.demo-tabs) */}
          <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-4" role="tablist" aria-label="IndoWings product views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pilot'}
              onClick={() => setActiveTab('pilot')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'pilot'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Pilot View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Administrator View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'manufacturer'}
              onClick={() => setActiveTab('manufacturer')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'manufacturer'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Manufacturer View
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'auditor'}
              onClick={() => setActiveTab('auditor')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-sm sm:text-[14px] font-extrabold transition-all cursor-pointer ${
                activeTab === 'auditor'
                  ? 'bg-[#3b0080] text-white shadow-sm border border-[#3b0080]'
                  : 'bg-white/90 text-[#171222] border border-[#3b0080]/15 hover:border-[#3b0080]/40 hover:bg-white'
              }`}
            >
              Auditor View
            </button>
          </div>

          {/* Inner Panel Card (.demo-panel) in pure crisp white */}
          <div className="p-6 sm:p-7 lg:p-8 rounded-lg border border-[#3b0080]/12 bg-white shadow-[0_8px_24px_rgba(23,18,34,0.03)]">
            <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-6 sm:gap-8 lg:gap-10 items-center">
              {/* Left Copy Column */}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#581c87] mb-2.5">
                  {current.eyebrow}
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#171222] leading-[1.12] mb-3.5">
                  {current.title}
                </h3>
                <p className="text-[15px] sm:text-base text-[#4b5563] leading-[1.65]">
                  {current.description}
                </p>
              </div>

              {/* Right Screenshot Column (.demo-shot) */}
              <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-[#3b0080]/10 shadow-[0_4px_16px_rgba(23,18,34,0.05)] bg-[#171222] relative group">
                <img 
                  key={activeTab}
                  src={current.image} 
                  alt={current.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
