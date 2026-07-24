import { useMemo } from "react";

type GaugeTheme = "green" | "amber" | "red" | "blue" | "indigo" | "auto";

interface GaugeCardProps {
  value: number;       // 0–100
  label: string;
  sublabel?: string;
  theme?: GaugeTheme;
  size?: number;
  showBar?: boolean;
}

function getAutoTheme(value: number): GaugeTheme {
  if (value >= 85) return "red";
  if (value >= 65) return "amber";
  return "green";
}

const THEME_COLORS: Record<GaugeTheme, { stroke: string; glow: string; text: string }> = {
  green:  { stroke: "#10b981", glow: "rgba(16,185,129,0.4)",   text: "#10b981" },
  amber:  { stroke: "#f59e0b", glow: "rgba(245,158,11,0.4)",   text: "#f59e0b" },
  red:    { stroke: "#ef4444", glow: "rgba(239,68,68,0.4)",    text: "#ef4444" },
  blue:   { stroke: "#3b82f6", glow: "rgba(59,130,246,0.4)",   text: "#3b82f6" },
  indigo: { stroke: "#6366f1", glow: "rgba(99,102,241,0.4)",   text: "#6366f1" },
  auto:   { stroke: "#10b981", glow: "rgba(16,185,129,0.4)",   text: "#10b981" },
};

export function GaugeCard({ value, label, sublabel, theme = "auto", size = 110, showBar = false }: GaugeCardProps) {
  const clampedValue = Math.min(100, Math.max(0, value ?? 0));
  const resolvedTheme = theme === "auto" ? getAutoTheme(clampedValue) : theme;
  const colors = THEME_COLORS[resolvedTheme];

  // Semicircle arc: starts at 180° (left), sweeps 180° to 0° (right)
  const r = 36;
  const cx = 50;
  const cy = 52;
  const circumference = Math.PI * r; // half circle
  const progress = (clampedValue / 100) * circumference;

  return (
    <div className="e-widget" style={{ padding: "18px 14px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* SVG gauge + value together in one block — NO absolute positioning */}
      <div style={{ position: "relative", width: size, height: size * 0.6 + 28, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* The SVG arc */}
        <svg
          width={size}
          height={size * 0.6}
          viewBox="0 0 100 58"
          style={{ display: "block", overflow: "visible", flexShrink: 0 }}
        >
          {/* Track */}
          <path
            d={`M 14,52 A ${r},${r} 0 0 1 86,52`}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d={`M 14,52 A ${r},${r} 0 0 1 86,52`}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{
              filter: `drop-shadow(0 0 5px ${colors.glow})`,
              transition: "stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)",
            }}
          />
          {/* Center dot */}
          <circle cx={cx} cy={cy} r={3} fill={colors.stroke} style={{ filter: `drop-shadow(0 0 3px ${colors.stroke})` }} />
        </svg>

        {/* Value text — flows naturally below SVG, no overlap */}
        <div style={{ textAlign: "center", lineHeight: 1, marginTop: 4 }}>
          <span style={{
            fontSize: 20, fontWeight: 800, color: colors.text,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
          }}>
            {clampedValue.toFixed(1)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.text, opacity: 0.75 }}>%</span>
        </div>
      </div>

      {/* Label block */}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          color: "var(--e-text-faint)",
        }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize: 11, color: "var(--e-text-muted)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
            {sublabel}
          </p>
        )}
      </div>

      {showBar && (
        <div className="e-progress" style={{ marginTop: 10, width: "100%" }}>
          <div
            className={`e-progress-bar ${resolvedTheme}`}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Inline mini progress ring for tables */
export function MiniRing({ value, size = 32, color = "#6366f1" }: { value: number; size?: number; color?: string }) {
  const r = 12;
  const circ = 2 * Math.PI * r;
  const progress = ((100 - value) / 100) * circ;

  return (
    <svg width={size} height={size} viewBox="0 0 30 30">
      <circle cx={15} cy={15} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle
        cx={15} cy={15} r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={progress}
        transform="rotate(-90 15 15)"
        style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text x={15} y={19} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">
        {Math.round(value)}
      </text>
    </svg>
  );
}
