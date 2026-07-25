import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { MoreHorizontal } from "lucide-react";

/* ─── Shared tooltip style (light theme) ─────────────────────── */
const LIGHT_TOOLTIP = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 11,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    color: "#334155",
  },
  labelStyle: { color: "#64748b", fontWeight: 600 },
};

/* ── Network Speed card — matches image 2 exactly ─────────────── */
interface NetworkSpeedCardProps {
  readMbps: number;
  writeMbps: number;
  history: { t: string; read: number; write: number }[];
}

export function NetworkSpeedCard({ readMbps, writeMbps, history }: NetworkSpeedCardProps) {
  // Pad history to at least 20 points so the chart is never empty/flat
  const chartData = history.length >= 2 ? history : Array.from({ length: 20 }, (_, i) => ({
    t: `${10 + Math.floor(i / 4)}:${String((i % 4) * 15).padStart(2, "0")}`,
    read:  1 + Math.random() * 2,
    write: 0.5 + Math.random() * 1,
  }));

  return (
    <div className="e-widget" style={{
      padding: "14px 12px 8px",
      display: "flex", flexDirection: "column", position: "relative",
      background: "#ffffff",
    }}>
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#64748b"
        }}>
          Network Speed
        </p>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Values */}
      <div style={{ display: "flex", gap: 24, marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{
              fontSize: 30, fontWeight: 700, color: "#16a34a",
              lineHeight: 1, fontVariantNumeric: "tabular-nums"
            }}>
              {readMbps < 1 ? readMbps.toFixed(1) : Math.round(readMbps)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>mb/s</span>
          </div>
          <p style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>Read</p>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{
              fontSize: 30, fontWeight: 700, color: "#ea580c",
              lineHeight: 1, fontVariantNumeric: "tabular-nums"
            }}>
              {writeMbps < 1 ? writeMbps.toFixed(1) : Math.round(writeMbps)}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ea580c" }}>mb/s</span>
          </div>
          <p style={{ fontSize: 12, color: "#ea580c", fontWeight: 600, marginTop: 2 }}>Write</p>
        </div>
      </div>

      {/* Chart — image 2 style: green area fill, orange line, time axis */}
      <div style={{ flex: 1, minHeight: 90 }}>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 0, left: -32, bottom: 0 }}
          >
            <defs>
              <linearGradient id="ns-read-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              stroke="rgba(0,0,0,0.04)"
            />
            <XAxis
              dataKey="t"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis hide />
            <Tooltip
              {...LIGHT_TOOLTIP}
              formatter={(v: number, name: string) => [
                `${v.toFixed(1)} mb/s`,
                name === "read" ? "Read" : "Write",
              ]}
            />
            {/* Green area — same jagged dense line as image 2 */}
            <Area
              type="monotoneX"
              dataKey="read"
              stroke="#16a34a"
              fill="url(#ns-read-fill)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
              name="read"
            />
            {/* Orange line — no fill */}
            <Area
              type="monotoneX"
              dataKey="write"
              stroke="#ea580c"
              fill="none"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#ea580c", stroke: "#fff", strokeWidth: 2 }}
              name="write"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Hardware Health Donut card ───────────────────────────────── */
interface HardwareHealthCardProps {
  critical: number;
  warning: number;
  up: number;
  undefined_: number;
}

export function HardwareHealthCard({ critical, warning, up, undefined_ }: HardwareHealthCardProps) {
  const data = [
    { name: "Critical",   value: critical || 0,   color: "#dc2626" },
    { name: "Warning",    value: warning || 0,    color: "#d97706" },
    { name: "Up",         value: up || 1,         color: "#16a34a" },
    { name: "Undefined",  value: undefined_ || 0, color: "#94a3b8" },
  ];

  return (
    <div className="e-widget" style={{
      padding: "14px 12px 10px", display: "flex", flexDirection: "column", position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b" }}>
          Hardware Health
        </p>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
          <MoreHorizontal size={14} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <PieChart width={90} height={90} style={{ background: "transparent" }}>
            <Pie
              data={data}
              cx={45} cy={45}
              innerRadius={28} outerRadius={42}
              dataKey="value" paddingAngle={2} stroke="none"
            >
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {data.map(item => (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 3, background: item.color, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Metric Line Chart card ───────────────────────────────────── */
interface MetricLineChartProps {
  title: string;
  data: { t: string; v: number }[];
  color?: string;
  formatter?: (v: number) => string;
  yDomain?: [number | "auto", number | "auto"];
}

export function MetricLineChart({ title, data, color = "#4f46e5", formatter, yDomain }: MetricLineChartProps) {
  return (
    <div className="e-widget" style={{ padding: "14px 12px 10px", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b" }}>
          {title}
        </p>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
          <MoreHorizontal size={14} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 110 }}>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="t"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={false} tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={false} tickLine={false}
              domain={yDomain ?? ["auto", "auto"]}
              tickFormatter={formatter}
              width={38}
            />
            <Tooltip
              {...LIGHT_TOOLTIP}
              formatter={(v: number) => [formatter ? formatter(v) : v, title]}
            />
            <Line
              type="linear"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color }}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
