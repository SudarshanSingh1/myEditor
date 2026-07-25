import { useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { MoreHorizontal } from "lucide-react";

/* ── Network Speed dual-line card ─────────────────────────────── */
interface NetworkSpeedCardProps {
  readMbps: number;
  writeMbps: number;
  history: { t: string; read: number; write: number }[];
}

export function NetworkSpeedCard({ readMbps, writeMbps, history }: NetworkSpeedCardProps) {
  return (
    <div className="e-widget" style={{ padding: "14px 12px 10px", display: "flex", flexDirection: "column", position: "relative" }}>
      <button style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--e-text-faint)", padding: 2 }}>
        <MoreHorizontal size={14} />
      </button>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-text-faint)", marginBottom: 6 }}>
        Network Speed
      </p>
      <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>{readMbps.toFixed(0)} </span>
          <span style={{ fontSize: 12, color: "#22c55e" }}>mb/s</span>
          <p style={{ fontSize: 10, color: "#22c55e", marginTop: 1 }}>Read</p>
        </div>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#f97316", fontVariantNumeric: "tabular-nums" }}>{writeMbps.toFixed(0)} </span>
          <span style={{ fontSize: 12, color: "#f97316" }}>mb/s</span>
          <p style={{ fontSize: 10, color: "#f97316", marginTop: 1 }}>Write</p>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 70 }}>
        <ResponsiveContainer width="100%" height={70}>
          <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ns-read" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <Tooltip
              contentStyle={{ background: "#0d0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Area type="monotone" dataKey="read"  stroke="#22c55e" fill="url(#ns-read)" strokeWidth={1.5} dot={false} name="Read mb/s" />
            <Area type="monotone" dataKey="write" stroke="#f97316" fill="none"          strokeWidth={1.5} dot={false} name="Write mb/s" />
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
    { name: `Critical (${critical})`, value: critical,  color: "#ef4444" },
    { name: `Warning (${warning})`,   value: warning,   color: "#f59e0b" },
    { name: `Up (${up})`,             value: up,        color: "#22c55e" },
    { name: "Undefined",              value: undefined_, color: "#475569" },
  ].filter(d => d.value > 0 || d.name === "Undefined");

  return (
    <div className="e-widget" style={{ padding: "14px 12px 10px", display: "flex", flexDirection: "column", position: "relative" }}>
      <button style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--e-text-faint)", padding: 2 }}>
        <MoreHorizontal size={14} />
      </button>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-text-faint)", marginBottom: 8 }}>
        Hardware Health Overview
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <PieChart width={90} height={90} style={{ background: "transparent" }}>
            <Pie data={data} cx={45} cy={45} innerRadius={28} outerRadius={42} dataKey="value" paddingAngle={2} stroke="none">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { color: "#ef4444", label: `Critical (${critical})` },
            { color: "#f59e0b", label: `Warning (${warning})` },
            { color: "#22c55e", label: `Up (${up})` },
            { color: "#475569", label: "Undefined" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 3, background: item.color, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "var(--e-text-secondary)", fontWeight: 500 }}>{item.label}</span>
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

export function MetricLineChart({ title, data, color = "#3b82f6", formatter, yDomain }: MetricLineChartProps) {
  return (
    <div className="e-widget" style={{ padding: "14px 12px 10px", display: "flex", flexDirection: "column", position: "relative" }}>
      <button style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--e-text-faint)", padding: 2 }}>
        <MoreHorizontal size={14} />
      </button>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-text-faint)", marginBottom: 8 }}>
        {title}
      </p>
      <div style={{ flex: 1, minHeight: 110 }}>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="t"
              tick={{ fill: "#475569", fontSize: 9 }}
              axisLine={false} tickLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 9 }}
              axisLine={false} tickLine={false}
              domain={yDomain ?? ["auto", "auto"]}
              tickFormatter={formatter}
              width={38}
            />
            <Tooltip
              contentStyle={{ background: "#0d0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#94a3b8" }}
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
