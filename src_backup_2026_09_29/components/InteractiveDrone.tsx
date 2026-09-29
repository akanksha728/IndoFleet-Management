import React from "react";
import { Shield, Radio, Sparkles, Navigation, Zap } from "lucide-react";

interface InteractiveDroneProps {
  onOrderClick?: () => void;
}

export const InteractiveDrone: React.FC<InteractiveDroneProps> = ({ onOrderClick }) => {
  return (
    <div className="relative w-full max-w-[460px] min-h-[460px] flex flex-col items-center justify-center select-none py-4">
      {/* ── Ambient Background Glows ── */}
      <div className="absolute inset-0 bg-[#bc13fe]/20 blur-[100px] rounded-full scale-90 animate-pulse pointer-events-none" />
      <div className="absolute w-[320px] h-[320px] bg-purple-600/20 blur-[80px] rounded-full pointer-events-none" />

      {/* ── Circular Orbital Grid Rings ── */}
      <div className="absolute w-[380px] h-[380px] rounded-full border border-white/[0.07] border-dashed animate-[spin_80s_linear_infinite] pointer-events-none" />
      <div className="absolute w-[280px] h-[280px] rounded-full border border-purple-500/20 pointer-events-none" />

      {/* ── Main Floating Character Container (Clean & Focused) ── */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Floating Character Image from CSCA */}
        <div className="relative flex justify-center">
          <img
            src="/images/floating-character.png"
            alt="IndoWings Flight Operator"
            className="relative z-10 w-full max-w-[280px] sm:max-w-[340px] h-auto object-contain pointer-events-none"
            style={{
              animation: "floatGlow 3.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── Soft Ground Shadow / Platform Pulse ── */}
        <div
          className="w-48 h-5 rounded-[100%] bg-[#bc13fe]/30 blur-[12px] -mt-4 pointer-events-none"
          style={{
            animation: "shadowPulse 3.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* ── Embedded CSS Animation (Exact CSCA Style) ── */}
      <style>{`
        @keyframes floatGlow {
          0%, 100% {
            transform: translateY(0);
            filter: drop-shadow(0 0 15px rgba(188, 19, 254, 0.45));
          }
          50% {
            transform: translateY(-16px);
            filter: drop-shadow(0 0 35px rgba(188, 19, 254, 0.85));
          }
        }
        @keyframes shadowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(0.75);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
};
