import React from "react";
import { cn } from "../../lib/utils";

interface SplashLoaderProps {
  message?: string;
  submessage?: string;
  className?: string;
  variant?: "default" | "admin" | "minimal";
}

export function SudarshanaMandala({
  className = "w-16 h-16",
  color: _color = "purple",
  isAdmin: _isAdmin,
}: {
  className?: string;
  color?: "purple" | "default" | string;
  isAdmin?: boolean;
}) {
  // Generate arrays for radial geometry
  const blades = Array.from({ length: 24 });
  const chalices = Array.from({ length: 12 });
  const rays = Array.from({ length: 16 });

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      {/* Outer ambient glow behind the mandala */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse transition-all duration-1000 bg-gradient-to-tr from-violet-600 via-purple-500 to-indigo-500"
      />

      {/* Main SVG Container */}
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full text-purple-400 relative z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]"
      >
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- LAYER 1: Outer Sudarshana Flaming Blades (Clockwise Rotation) --- */}
        <g className="origin-center animate-[spin_18s_linear_infinite]">
          <circle cx="150" cy="150" r="120" stroke="#d8b4fe" strokeWidth="1.5" strokeDasharray="6 3" fill="none" opacity="0.7" />
          <circle cx="150" cy="150" r="115" stroke="#c084fc" strokeWidth="1" fill="none" opacity="0.5" />
          {blades.map((_, i) => (
            <path
              key={`blade-${i}`}
              d="M 150 30 C 158 15, 172 18, 168 5 C 160 12, 152 18, 150 30 Z"
              fill="#c084fc"
              stroke="#e9d5ff"
              strokeWidth="0.5"
              opacity="0.95"
              transform={`rotate(${i * 15} 150 150)`}
            />
          ))}
        </g>

        {/* --- LAYER 2: Middle Rosary Ring & Chalice / Bell Motifs (Counter-Clockwise Rotation) --- */}
        <g className="origin-center animate-[spin_25s_linear_infinite_reverse]">
          <circle
            cx="150"
            cy="150"
            r="106"
            stroke="#e9d5ff"
            strokeWidth="3.5"
            strokeDasharray="1.5 8.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <circle cx="150" cy="150" r="98" stroke="#d8b4fe" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="150" cy="150" r="65" stroke="#c084fc" strokeWidth="1.2" fill="none" opacity="0.7" />

          {chalices.map((_, i) => (
            <g key={`chalice-${i}`} transform={`rotate(${i * 30} 150 150)`}>
              <line x1="150" y1="105" x2="150" y2="85" stroke="#e9d5ff" strokeWidth="1.5" opacity="0.8" />
              <path
                d="M 138 85 C 132 70, 138 56, 150 54 C 162 56, 168 70, 162 85 Z"
                fill="none"
                stroke="#d8b4fe"
                strokeWidth="1.5"
              />
              <circle cx="150" cy="67" r="3.5" fill="#a855f7" opacity="0.9" />
              <path d="M 136 85 Q 128 75, 134 65" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.5" />
              <path d="M 164 85 Q 172 75, 166 65" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.5" />
            </g>
          ))}
        </g>

        {/* --- LAYER 3: Inner Lotus Petals Ring (Clockwise Rotation) --- */}
        <g className="origin-center animate-[spin_12s_linear_infinite]">
          <circle cx="150" cy="150" r="45" stroke="#e9d5ff" strokeWidth="1.5" fill="none" opacity="0.8" />
          {chalices.map((_, i) => (
            <g key={`petal-${i}`} transform={`rotate(${i * 30 + 15} 150 150)`}>
              <path
                d="M 150 122 Q 136 104, 150 88 Q 164 104, 150 122 Z"
                fill="none"
                stroke="#f3e8ff"
                strokeWidth="1.5"
                opacity="0.9"
              />
              <path
                d="M 150 120 Q 142 107, 150 95 Q 158 107, 150 120 Z"
                fill="#c084fc"
                opacity="0.35"
              />
            </g>
          ))}
        </g>

        {/* --- LAYER 4: Central Radiant Sun Hub (Pulsing Glow) --- */}
        <g className="origin-center animate-pulse" style={{ animationDuration: "2.5s" }}>
          <circle cx="150" cy="150" r="44" fill="url(#hubGlow)" />
          <circle cx="150" cy="150" r="26" stroke="#ffffff" strokeWidth="2" fill="none" />
          {rays.map((_, i) => (
            <line
              key={`ray-${i}`}
              x1="150"
              y1="134"
              x2="150"
              y2="127"
              stroke="#e9d5ff"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${i * 22.5} 150 150)`}
            />
          ))}
          <circle cx="150" cy="150" r="14" stroke="#e9d5ff" strokeWidth="1.5" fill="#a855f7" opacity="0.9" />
          <circle cx="150" cy="150" r="6" fill="#050508" stroke="#c084fc" strokeWidth="1.2" />
          <circle cx="150" cy="150" r="2" fill="white" />
        </g>
      </svg>
    </div>
  );
}

export function SplashLoader({
  className,
}: SplashLoaderProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#050508] text-white",
        className
      )}
    >
      {/* Exact small standard size without any text, animated spinning purple mandala */}
      <SudarshanaMandala className="w-20 h-20 sm:w-24 sm:h-24" color="purple" />
    </div>
  );
}
