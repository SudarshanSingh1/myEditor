import { useState, useEffect } from "react";
import { Minus, Square, X } from "lucide-react";

interface WindowControlsProps {
  className?: string;
  size?: "sm" | "md";
}

export function WindowControls({ className = "", size = "md" }: WindowControlsProps) {
  const [isWindows, setIsWindows] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsWindows(navigator.userAgent.toLowerCase().includes("windows"));
    }
  }, []);

  if (!mounted || !isWindows) {
    const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className={`${dotSize} rounded-full bg-red-500/80`} />
        <div className={`${dotSize} rounded-full bg-yellow-500/80`} />
        <div className={`${dotSize} rounded-full bg-green-500/80`} />
      </div>
    );
  }

  const iconSize = size === "sm" ? 10 : 12;
  return (
    <div className={`flex items-center gap-2.5 text-zinc-500 ${className}`}>
      <Minus size={iconSize} className="hover:text-zinc-300 transition-colors cursor-default" strokeWidth={2.5} />
      <Square size={iconSize} className="hover:text-zinc-300 transition-colors cursor-default" strokeWidth={2.5} />
      <X size={iconSize} className="hover:text-zinc-300 transition-colors cursor-default" strokeWidth={2.5} />
    </div>
  );
}
