import { useMemo } from "react";
import { MoreHorizontal } from "lucide-react";

type GaugeTheme = "green" | "amber" | "red" | "blue" | "indigo" | "orange" | "auto";

interface GaugeCardProps {
  value: number;       // 0–100
  label: string;
  displayValue?: string; // custom display (e.g. "004 ms", "3.69 MB")
  sublabel?: string;
  theme?: GaugeTheme;
  size?: number;
  showMenu?: boolean;
}

function getAutoTheme(value: number): GaugeTheme {
  if (value >= 85) return "red";
  if (value >= 65) return "amber";
  return "green";
}

const THEME_COLORS: Record<GaugeTheme, { stroke: string; glow: string; text: string; track: string }> = {
  green:  { stroke: "#22c55e", glow: "rgba(34,197,94,0.35)",   text: "#22c55e", track: "rgba(255,255,255,0.07)" },
  amber:  { stroke: "#f59e0b", glow: "rgba(245,158,11,0.35)",  text: "#f59e0b", track: "rgba(255,255,255,0.07)" },
  red:    { stroke: "#ef4444", glow: "rgba(239,68,68,0.35)",   text: "#ef4444", track: "rgba(255,255,255,0.07)" },
  orange: { stroke: "#f97316", glow: "rgba(249,115,22,0.35)",  text: "#f97316", track: "rgba(255,255,255,0.07)" },
  blue:   { stroke: "#3b82f6", glow: "rgba(59,130,246,0.35)",  text: "#3b82f6", track: "rgba(255,255,255,0.07)" },
  indigo: { stroke: "#6366f1", glow: "rgba(99,102,241,0.35)",  text: "#6366f1", track: "rgba(255,255,255,0.07)" },
  auto:   { stroke: "#22c55e", glow: "rgba(34,197,94,0.35)",   text: "#22c55e", track: "rgba(255,255,255,0.07)" },
};

export function GaugeCard({ value, label, displayValue, sublabel, theme = "auto", size = 130, showMenu = true }: GaugeCardProps) {
  const clampedValue = Math.min(100, Math.max(0, value ?? 0));
  const resolvedTheme = theme === "auto" ? getAutoTheme(clampedValue) : theme;
  const colors = THEME_COLORS[resolvedTheme];

  // Semicircle: center at (cx, cy), radius r, goes from 180° to 0°
  const cx = 60, cy = 60, r = 44;
  const strokeW = 10;
  const circumference = Math.PI * r; // half circle = π*r
  const progress = (clampedValue / 100) * circumference;

  // Needle angle: -180° (left) to 0° (right), mapped from 0–100
  // In SVG terms, angle from positive-x axis. Needle points upward at 50%.
  // angleRad: from π (left) to 0 (right)
  const angleRad = Math.PI - (clampedValue / 100) * Math.PI;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(angleRad);
  const ny = cy - needleLen * Math.sin(angleRad);

  return (
    <div className="e-widget" style={{
      padding: "14px 12px 14px",
      display: "flex", flexDirection: "column", alignItems: "center",
      position: "relative", gap: 0
    }}>
      {showMenu && (
        <button
          style={{
            position: "absolute", top: 10, right: 10,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--e-text-faint)", padding: 2, borderRadius: 4,
          }}
          title="Options"
        >
          <MoreHorizontal size={14} />
        </button>
      )}

      {/* SVG gauge */}
      <svg
        width={size}
        height={size * 0.55}
        viewBox={`0 0 120 68`}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Track arc */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeW}
          strokeLinecap="butt"
        />
        {/* Progress arc */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeW}
          strokeLinecap="butt"
          strokeDasharray={`${progress} ${circumference}`}
          style={{
            filter: `drop-shadow(0 0 4px ${colors.glow})`,
            transition: "stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={nx} y2={ny}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ transition: "x2 900ms cubic-bezier(0.4,0,0.2,1), y2 900ms cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r={3.5} fill="#475569" />
        <circle cx={cx} cy={cy} r={1.5} fill="#94a3b8" />
      </svg>

      {/* Value */}
      <div style={{ textAlign: "center", lineHeight: 1, marginTop: 6 }}>
        <span style={{
          fontSize: 22, fontWeight: 700, color: colors.text,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
          fontFamily: "'Inter', monospace",
        }}>
          {displayValue ?? `${clampedValue.toFixed(1)} %`}
        </span>
      </div>

      {/* Label */}
      <div style={{ textAlign: "center", marginTop: 6 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--e-text-faint)",
        }}>
          {label}
        </p>
        {sublabel && (
          <p style={{ fontSize: 10, color: "var(--e-text-muted)", marginTop: 2 }}>{sublabel}</p>
        )}
      </div>
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
