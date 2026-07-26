import React from "react";
import { cn } from "../../lib/utils";

interface SplashLoaderProps {
  message?: string;
  submessage?: string;
  className?: string;
  variant?: "default" | "admin" | "minimal";
}

function SudarshanaMandala({ isAdmin }: { isAdmin: boolean }) {
  // Generate arrays for radial geometry
  const blades = Array.from({ length: 24 });
  const chalices = Array.from({ length: 12 });
  const rays = Array.from({ length: 16 });

  return (
    <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 mb-6 select-none">
      {/* Outer ambient glow behind the mandala */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse transition-all duration-1000",
          isAdmin
            ? "bg-gradient-to-tr from-violet-600 via-purple-500 to-indigo-500"
            : "bg-gradient-to-tr from-green-400 via-emerald-500 to-cyan-500"
        )}
      />

      {/* Main SVG Container */}
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
      >
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- LAYER 1: Outer Sudarshana Flaming Blades (Clockwise Rotation) --- */}
        <g className="origin-center animate-[spin_18s_linear_infinite]">
          {/* Outer Boundary & Inner Track */}
          <circle cx="150" cy="150" r="120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 3" fill="none" opacity="0.7" />
          <circle cx="150" cy="150" r="115" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
          
          {/* 24 Curved Crescent Teeth / Blades */}
          {blades.map((_, i) => (
            <path
              key={`blade-${i}`}
              d="M 150 30 C 158 15, 172 18, 168 5 C 160 12, 152 18, 150 30 Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.95"
              transform={`rotate(${i * 15} 150 150)`}
            />
          ))}
        </g>

        {/* --- LAYER 2: Middle Rosary Ring & Chalice / Bell Motifs (Counter-Clockwise Rotation) --- */}
        <g className="origin-center animate-[spin_25s_linear_infinite_reverse]">
          {/* Rosary Beaded Ring */}
          <circle
            cx="150"
            cy="150"
            r="106"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeDasharray="1.5 8.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <circle cx="150" cy="150" r="98" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
          <circle cx="150" cy="150" r="65" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.7" />

          {/* 12 Chalice / Bell Domes & Radial Spokes */}
          {chalices.map((_, i) => (
            <g key={`chalice-${i}`} transform={`rotate(${i * 30} 150 150)`}>
              {/* Radial Spoke */}
              <line x1="150" y1="105" x2="150" y2="85" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
              {/* Dome / Bell Structure */}
              <path
                d="M 138 85 C 132 70, 138 56, 150 54 C 162 56, 168 70, 162 85 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              {/* Inner Jewel Bead */}
              <circle cx="150" cy="67" r="3.5" fill="currentColor" opacity="0.9" />
              {/* Filigree Swirls */}
              <path d="M 136 85 Q 128 75, 134 65" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <path d="M 164 85 Q 172 75, 166 65" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </g>
          ))}
        </g>

        {/* --- LAYER 3: Inner Lotus Petals Ring (Clockwise Rotation) --- */}
        <g className="origin-center animate-[spin_12s_linear_infinite]">
          <circle cx="150" cy="150" r="45" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.8" />
          
          {/* 12 Lotus Petals offset by 15° */}
          {chalices.map((_, i) => (
            <g key={`petal-${i}`} transform={`rotate(${i * 30 + 15} 150 150)`}>
              {/* Outer Petal Frame */}
              <path
                d="M 150 122 Q 136 104, 150 88 Q 164 104, 150 122 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.9"
              />
              {/* Inner Petal Flame */}
              <path
                d="M 150 120 Q 142 107, 150 95 Q 158 107, 150 120 Z"
                fill="currentColor"
                opacity="0.35"
              />
            </g>
          ))}
        </g>

        {/* --- LAYER 4: Central Radiant Sun Hub (Pulsing Glow) --- */}
        <g className="origin-center animate-pulse" style={{ animationDuration: "2.5s" }}>
          {/* Ambient Hub Glow */}
          <circle cx="150" cy="150" r="44" fill="url(#hubGlow)" />
          
          {/* Core Ring & Sun Rays */}
          <circle cx="150" cy="150" r="26" stroke="currentColor" strokeWidth="2" fill="none" />
          {rays.map((_, i) => (
            <line
              key={`ray-${i}`}
              x1="150"
              y1="134"
              x2="150"
              y2="127"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${i * 22.5} 150 150)`}
            />
          ))}
          
          {/* Innermost Eye / Bindu */}
          <circle cx="150" cy="150" r="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.9" />
          <circle cx="150" cy="150" r="6" fill="#050508" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="150" cy="150" r="2" fill="white" />
        </g>
      </svg>
    </div>
  );
}

export function SplashLoader({
  message = "Preparing your workspace...",
  submessage = "Setting up cloud environment",
  className,
  variant = "default",
}: SplashLoaderProps) {
  const isAdmin = variant === "admin";

  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#050508] text-white selection:bg-green-500/30",
        className
      )}
    >
      {/* Ambient glowing background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className={cn(
            "absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[140px] transition-all duration-1000",
            isAdmin ? "bg-violet-600/25" : "bg-green-500/20"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-40 left-1/3 h-96 w-96 rounded-full blur-[160px] transition-all duration-1000",
            isAdmin ? "bg-purple-600/20" : "bg-cyan-500/20"
          )}
        />
      </div>

      {/* Glassmorphism Loader Card */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.7)] max-w-md w-full mx-4 text-center">
        
        {/* Ornate Animated Sudarshana Mandala / Chakra */}
        <SudarshanaMandala isAdmin={isAdmin} />

        {/* Brand Title */}
        <h1 className="font-cursive text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 drop-shadow-md">
          Hamara Editor
        </h1>

        {/* Status Message */}
        <p
          className={cn(
            "text-sm font-medium tracking-wide mb-1 transition-colors",
            isAdmin ? "text-violet-300" : "text-green-400"
          )}
        >
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-zinc-400 max-w-[240px] leading-relaxed">
            {submessage}
          </p>
        )}

        {/* Modern Shimmer Progress Bar */}
        <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full w-1/2 rounded-full",
              isAdmin
                ? "bg-gradient-to-r from-transparent via-violet-500 to-transparent"
                : "bg-gradient-to-r from-transparent via-green-400 to-transparent"
            )}
            style={{
              backgroundSize: "200% 100%",
              animation: "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
