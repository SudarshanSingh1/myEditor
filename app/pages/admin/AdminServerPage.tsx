import { useState, useEffect } from "react";

import { fetchApi } from "../../lib/api";

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Server, Network, Container, RefreshCw, Activity, Wifi } from "lucide-react";
import { GaugeCard } from "../../components/enterprise/GaugeCard";

import { WidgetShell } from "../../components/enterprise/WidgetShell";

import { MetricCard } from "../../components/enterprise/MetricCard";

import { StatusChip, LiveDot } from "../../components/enterprise/MiniSparkline";

import { PageHeader } from "../../components/enterprise/PageHeader";

import { EnterpriseTable } from "../../components/enterprise/EnterpriseTable";

interface ServerData {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  api_status: string;
  docker_status: string;
  docker_containers: number;
  network_sent_mb: number;
  network_recv_mb: number;
  uptime_seconds: number;
  process_count: number;
  service_health: string;
  worker_health: string;
}

interface WorkerData {
  id: string;
  hostname: string;
  status: string;
  cpu_percent: number;
  memory_percent: number;
  active_executions: number;
  last_heartbeat: string;
}

function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminServerPage() {
  const [data, setData] = useState<ServerData | null>(null);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [history, setHistory] = useState<{ t: string; cpu: number; ram: number; disk: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const poll = async () => {
    try {
      const resp = await fetchApi("/admin/server");
      if (resp?.success) {
        const d = resp.data as ServerData;
        setData(d);
        setLastUpdate(new Date());
        setHistory(prev => {
          const next = [...prev, {
            t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            cpu: d.cpu_percent,
            ram: d.ram_percent,
            disk: d.disk_percent,
          }];
          return next.slice(-24);
        });
      }
      const wResp = await fetchApi("/admin/server/workers");
      if (wResp?.success) setWorkers(wResp.data.items || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    poll();
    // Only poll while the tab is visible — pause when hidden to save resources
    const id = setInterval(() => {
      if (!document.hidden) poll();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const workerColumns = [
    { key: "hostname", label: "Worker Node", render: (r: WorkerData) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LiveDot status={r.status === "online" ? "online" : "offline"} />
        <span style={{ fontWeight: 600, color: "var(--e-text-primary)", fontFamily: "monospace", fontSize: 12 }}>{r.hostname}</span>
      </div>
    )},
    { key: "status", label: "Status", render: (r: WorkerData) => <StatusChip status={r.status} /> },
    { key: "cpu_percent", label: "CPU", render: (r: WorkerData) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
        <div className="e-progress" style={{ flex: 1 }}>
          <div className={`e-progress-bar ${r.cpu_percent > 80 ? "red" : r.cpu_percent > 60 ? "amber" : "green"}`} style={{ width: `${r.cpu_percent}%` }} />
        </div>
        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", minWidth: 32, color: "var(--e-text-muted)" }}>{r.cpu_percent?.toFixed(0)}%</span>
      </div>
    )},
    { key: "memory_percent", label: "Memory", render: (r: WorkerData) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 80 }}>
        <div className="e-progress" style={{ flex: 1 }}>
          <div className={`e-progress-bar ${r.memory_percent > 80 ? "red" : "blue"}`} style={{ width: `${r.memory_percent}%` }} />
        </div>
        <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", minWidth: 32, color: "var(--e-text-muted)" }}>{r.memory_percent?.toFixed(0)}%</span>
      </div>
    )},
    { key: "active_executions", label: "Active Tasks", render: (r: WorkerData) => (
      <span style={{ fontWeight: 700, color: r.active_executions > 0 ? "var(--e-blue)" : "var(--e-text-muted)", fontVariantNumeric: "tabular-nums" }}>
        {r.active_executions}
      </span>
    )},
    { key: "last_heartbeat", label: "Last Heartbeat", render: (r: WorkerData) => (
      <span style={{ fontSize: 11, color: "var(--e-text-faint)", fontVariantNumeric: "tabular-nums" }}>
        {new Date(r.last_heartbeat).toLocaleTimeString()}
      </span>
    )},
  ];

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Server Infrastructure"
        subtitle="Real-time system metrics and worker telemetry"
        icon={Server}
        liveIndicator
        lastUpdate={lastUpdate}
        actions={
          <button onClick={poll} className="e-btn e-btn-secondary e-btn-sm" style={{ gap: 6 }}>
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Gauge Row */}
        <div className="e-grid-4" style={{ gap: 12 }}>
          <GaugeCard value={data?.cpu_percent ?? 0}  label="CPU Utilization"  sublabel={`${data?.cpu_percent?.toFixed(1) ?? 0}% used`}  theme="auto" showBar />
          <GaugeCard value={data?.ram_percent ?? 0}  label="Memory Usage"     sublabel={`${data?.ram_used_gb?.toFixed(1) ?? 0} / ${data?.ram_total_gb?.toFixed(1) ?? 0} GB`} theme="auto" showBar />
          <GaugeCard value={data?.disk_percent ?? 0} label="Disk Usage"       sublabel={`${data?.disk_used_gb?.toFixed(0) ?? 0} / ${data?.disk_total_gb?.toFixed(0) ?? 0} GB`} theme="auto" showBar />
          <div className="e-widget" style={{ padding: "16px 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="e-widget-title" style={{ padding: 0, borderBottom: "none" }}>Service Status</p>
            {[
              { label: "API Gateway",    status: data?.api_status    ?? "unknown" },
              { label: "Docker Engine",  status: data?.docker_status ?? "unknown" },
              { label: "Worker Health",  status: data?.worker_health ?? "unknown" },
              { label: "Service Health", status: data?.service_health ?? "unknown" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "var(--e-bg-elevated)", borderRadius: "var(--e-radius-sm)", border: "1px solid var(--e-border)" }}>
                <span style={{ fontSize: 11, color: "var(--e-text-secondary)" }}>{s.label}</span>
                <StatusChip status={s.status.toLowerCase()} />
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="e-grid-4" style={{ gap: 12 }}>
          <MetricCard label="Network Sent"      value={`${data?.network_sent_mb?.toFixed(1) ?? 0} MB`} icon={Wifi}      iconColor="var(--e-blue)"   iconBg="var(--e-blue-bg)"  subtext="total sent" />
          <MetricCard label="Network Recv"      value={`${data?.network_recv_mb?.toFixed(1) ?? 0} MB`} icon={Network}   iconColor="var(--e-cyan)"   iconBg="var(--e-cyan-bg)"  subtext="total recv" />
          <MetricCard label="Active Containers" value={data?.docker_containers ?? 0}                    icon={Container} iconColor="var(--e-purple)" iconBg="var(--e-purple-bg)" subtext="docker" />
          <MetricCard label="Process Count"     value={data?.process_count ?? 0}                        icon={Activity}  iconColor="var(--e-amber)"  iconBg="var(--e-amber-bg)" subtext={`Uptime: ${data?.uptime_seconds ? fmtUptime(data.uptime_seconds) : "—"}`} />
        </div>

        {/* Live Telemetry Chart */}
        <WidgetShell title="Live Telemetry" subtitle="CPU · Memory · Disk — updating every 5s" isLoading={loading}>
          {history.length < 2 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--e-text-faint)", fontSize: 13 }}>
              <RefreshCw size={14} className="animate-spin" style={{ marginRight: 8 }} />
              Establishing connection...
            </div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`]}
                  />
                  <Line type="monotone" dataKey="cpu"  stroke="#6366f1" strokeWidth={2} dot={false} name="CPU %"  activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ram"  stroke="#06b6d4" strokeWidth={2} dot={false} name="RAM %"  activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="disk" stroke="#10b981" strokeWidth={2} dot={false} name="Disk %" activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {[{ c: "#6366f1", l: "CPU" }, { c: "#06b6d4", l: "RAM" }, { c: "#10b981", l: "Disk" }].map(i => (
              <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--e-text-muted)" }}>
                <span style={{ width: 20, height: 2, background: i.c, borderRadius: 1, display: "inline-block" }} />
                {i.l}
              </div>
            ))}
          </div>
        </WidgetShell>

        {/* Worker Nodes Table */}
        <WidgetShell
          title="Worker Nodes"
          subtitle={`${workers.length} active nodes`}
          noPadding
        >
          <EnterpriseTable
            columns={workerColumns as any}
            data={workers.map(w => ({ ...w, id: w.id || w.hostname }))}
            isLoading={loading}
            emptyText="No active worker nodes found."
            compact
          />
        </WidgetShell>

      </div>
    </div>
  );
}
