import { MoreHorizontal } from "lucide-react";

type GaugeTheme = "green" | "amber" | "red" | "blue" | "indigo" | "orange" | "auto";

interface GaugeCardProps {
  value: number;       // 0–100
  label: string;
  displayValue?: string;
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

const THEME_COLORS: Record<GaugeTheme, { stroke: string; text: string }> = {
  green:  { stroke: "#16a34a", text: "#16a34a" },
  amber:  { stroke: "#d97706", text: "#d97706" },
  red:    { stroke: "#dc2626", text: "#dc2626" },
  orange: { stroke: "#ea580c", text: "#ea580c" },
  blue:   { stroke: "#2563eb", text: "#2563eb" },
  indigo: { stroke: "#4f46e5", text: "#4f46e5" },
  auto:   { stroke: "#16a34a", text: "#16a34a" },
};

export function GaugeCard({ value, label, displayValue, sublabel, theme = "auto", size = 130, showMenu = true }: GaugeCardProps) {
  const clampedValue = Math.min(100, Math.max(0, value ?? 0));
  const resolvedTheme = theme === "auto" ? getAutoTheme(clampedValue) : theme;
  const colors = THEME_COLORS[resolvedTheme];

  const cx = 60, cy = 60, r = 44;
  const strokeW = 10;
  const circumference = Math.PI * r;
  const progress = (clampedValue / 100) * circumference;

  // Needle angle: π (left) → 0 (right) over 0→100
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
        >
          <MoreHorizontal size={14} />
        </button>
      )}

      <svg
        width={size}
        height={size * 0.55}
        viewBox={`0 0 120 68`}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Track arc — light grey */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`}
          fill="none"
          stroke="#e2e8f0"
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
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)" }}
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
        <circle cx={cx} cy={cy} r={3.5} fill="#cbd5e1" />
        <circle cx={cx} cy={cy} r={1.5} fill="#94a3b8" />
      </svg>

      {/* Value */}
      <div style={{ textAlign: "center", lineHeight: 1, marginTop: 6 }}>
        <span style={{
          fontSize: 20, fontWeight: 700, color: colors.text,
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
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

/** Mini progress ring for tables */
export function MiniRing({ value, size = 32, color = "#4f46e5" }: { value: number; size?: number; color?: string }) {
  const r = 12;
  const circ = 2 * Math.PI * r;
  const progress = ((100 - value) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 30 30">
      <circle cx={15} cy={15} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3} />
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
      <text x={15} y={19} textAnchor="middle" fill="#334155" fontSize={8} fontWeight="bold">
        {Math.round(value)}
      </text>
    </svg>
  );
}
