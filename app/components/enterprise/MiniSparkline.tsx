import { ResponsiveContainer, AreaChart, Area, Tooltip, LineChart, Line, BarChart, Bar } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  type?: "area" | "line" | "bar";
  filled?: boolean;
}

export function MiniSparkline({ data, color = "#6366f1", height = 40, type = "area", filled = true }: SparklineProps) {
  const chartData = data.map((v, i) => ({ v, i }));

  const gradId = `spark-${color.replace("#", "")}-${Math.random().toString(36).slice(2, 5)}`;

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} opacity={0.8} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={filled ? 0.4 : 0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
        <Tooltip
          content={() => null}
          cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Small colored circle status dot with optional ping animation */
export function LiveDot({ status }: { status: "online" | "warning" | "offline" | "pending" }) {
  const colors: Record<string, string> = {
    online: "var(--e-green)",
    warning: "var(--e-amber)",
    offline: "var(--e-red)",
    pending: "var(--e-purple)",
  };
  const c = colors[status] || colors.online;

  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span
        className="e-ping"
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: c, opacity: 0.6,
        }}
      />
      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: c }} />
    </span>
  );
}

/** Status chip with optional dot */
export function StatusChip({
  status, label, dot = true
}: {
  status: "online" | "offline" | "warning" | "running" | "failed" | "pending" | "healthy" | "degraded" | "queued" | "active" | "info" | string;
  label?: string;
  dot?: boolean;
}) {
  const chipClass = `e-chip ${status.toLowerCase()}`;
  const dotColors: Record<string, string> = {
    online: "var(--e-green)", healthy: "var(--e-green)", active: "var(--e-green)", running: "var(--e-green)",
    warning: "var(--e-amber)", degraded: "var(--e-amber)",
    offline: "var(--e-red)", failed: "var(--e-red)", error: "var(--e-red)", critical: "var(--e-red)",
    pending: "var(--e-purple)", queued: "var(--e-purple)",
    info: "var(--e-blue)", syncing: "var(--e-blue)",
  };

  return (
    <span className={chipClass}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: dotColors[status.toLowerCase()] || "var(--e-text-muted)",
          flexShrink: 0
        }} />
      )}
      {label || status}
    </span>
  );
}
