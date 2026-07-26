import React from "react";
import { cn } from "../../lib/utils";

interface SplashLoaderProps {
  message?: string;
  submessage?: string;
  className?: string;
  variant?: "default" | "admin" | "minimal";
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
            "absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[120px] transition-all duration-1000",
            isAdmin ? "bg-violet-600/20" : "bg-green-500/15"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-40 left-1/3 h-96 w-96 rounded-full blur-[140px] transition-all duration-1000",
            isAdmin ? "bg-purple-600/15" : "bg-cyan-500/15"
          )}
        />
      </div>

      {/* Glassmorphism Loader Card */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.07] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-w-sm w-full mx-4 text-center">
        {/* Animated Logo Container */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer glowing pulsing ring */}
          <div
            className={cn(
              "absolute -inset-3 rounded-2xl opacity-60 blur-md animate-pulse",
              isAdmin
                ? "bg-gradient-to-tr from-violet-600 to-purple-400"
                : "bg-gradient-to-tr from-green-400 via-emerald-500 to-cyan-500"
            )}
          />
          {/* Inner spinning border */}
          <div
            className={cn(
              "absolute -inset-1 rounded-xl border border-t-transparent animate-spin",
              isAdmin ? "border-violet-500/80" : "border-green-400/80"
            )}
            style={{ animationDuration: "1.5s" }}
          />
          {/* Logo Box */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-[#0a0a0f] border border-white/10 shadow-inner">
            <img
              src="/logo.svg"
              alt="Hamara Editor"
              className="h-9 w-9 object-contain dark:invert animate-pulse"
              style={{ animationDuration: "2s" }}
            />
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="font-cursive text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
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
          <p className="text-xs text-zinc-400 max-w-[220px] leading-relaxed">
            {submessage}
          </p>
        )}

        {/* Modern Shimmer Progress Bar */}
        <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full w-1/2 rounded-full",
              isAdmin
                ? "bg-gradient-to-r from-transparent via-violet-500 to-transparent"
                : "bg-gradient-to-r from-transparent via-green-400 to-transparent"
            )}
            style={{
              backgroundSize: "200% 100%",
              animation: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
