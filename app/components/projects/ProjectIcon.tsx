import { Terminal, Code, Zap, Book, Rocket, Cpu, Box, Database, Flame, Layers } from "lucide-react";
import React from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  Terminal,
  Code,
  Zap,
  Book,
  Rocket,
  Cpu,
  Box,
  Database,
  Flame,
  Layers,
};

export const PROJECT_ICON_NAMES = Object.keys(ICON_MAP);

export function ProjectIcon({ name, className }: { name?: string | null, className?: string }) {
  if (!name) return <span className={className}>📁</span>;
  
  // If it's a key in our Lucide icon map, render the Lucide icon
  const IconComponent = ICON_MAP[name];
  if (IconComponent) {
    return <IconComponent className={className || "w-4 h-4"} />;
  }

  // Otherwise, fallback to assuming it's an emoji (legacy support)
  return <span className={className}>{name}</span>;
}
