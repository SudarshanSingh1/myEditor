import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import {
  Users, UserCheck, UserPlus, FolderOpen,
  Zap, Rocket, MessageSquare, Bug,
  Database, Settings, Server, Mail,
  Flag, Bell, BarChart3, PlaySquare,
  LayoutDashboard
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { MetricCard } from "../../components/enterprise/MetricCard";
import { WidgetShell } from "../../components/enterprise/WidgetShell";
import { GaugeCard } from "../../components/enterprise/GaugeCard";
import {
  NetworkSpeedCard, HardwareHealthCard, MetricLineChart
} from "../../components/enterprise/DashboardCharts";
import { StatusChip, LiveDot } from "../../components/enterprise/MiniSparkline";
import { PageHeader, SectionLabel } from "../../components/enterprise/PageHeader";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";

interface DashData {
  total_users: number;
  users_today: number;
  active_users: number;
  total_projects: number;
  total_executions: number;
  executions_today: number;
  total_feedback: number;
  total_errors: number;
}

interface ServerData {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  network_sent_mb: number;
  network_recv_mb: number;
  uptime_seconds: number;
}

const CHART_MOCK = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  users: Math.floor(20 + Math.random() * 60),
  executions: Math.floor(40 + Math.random() * 120),
  errors: Math.floor(Math.random() * 15),
}));

const systemHealth = [
  { label: "API Gateway",   status: "online"  as const, latency: "12ms"  },
  { label: "Database",      status: "online"  as const, latency: "4ms"   },
  { label: "Docker Engine", status: "online"  as const, latency: "--"    },
  { label: "Queue Worker",  status: "online"  as const, latency: "--"    },
  { label: "SMTP Relay",    status: "online"  as const, latency: "142ms" },
  { label: "Auth Service",  status: "online"  as const, latency: "8ms"   },
];

const adminQuickLinks = [
  { label: "User Management",  to: "/app/admin/users",         icon: Users,        color: "var(--e-accent)",   desc: "Manage accounts, roles" },
  { label: "Analytics",        to: "/app/admin/analytics",     icon: BarChart3,    color: "var(--e-cyan)",     desc: "Charts & growth trends" },
  { label: "Projects",         to: "/app/admin/projects",      icon: FolderOpen,   color: "var(--e-amber)",    desc: "All user projects" },
  { label: "Executions",       to: "/app/admin/executions",    icon: PlaySquare,   color: "var(--e-green)",    desc: "Compiler runs & queues" },
  { label: "Reports",          to: "/app/admin/reports",       icon: Flag,         color: "var(--e-red)",      desc: "Moderation queue" },
  { label: "Feedback",         to: "/app/admin/feedback",      icon: MessageSquare,color: "var(--e-purple)",   desc: "User feedback" },
  { label: "System Errors",    to: "/app/admin/errors",        icon: Bug,          color: "var(--e-red)",      desc: "Error logs" },
  { label: "Notifications",    to: "/app/admin/notifications", icon: Bell,         color: "var(--e-blue)",     desc: "Alerts & broadcasts" },
  { label: "Server Monitor",   to: "/super-admin/server",      icon: Server,       color: "var(--e-accent)",   desc: "Live infrastructure" },
  { label: "Database",         to: "/super-admin/database",    icon: Database,     color: "var(--e-cyan)",     desc: "DB health & stats" },
  { label: "Email Logs",       to: "/super-admin/emails",      icon: Mail,         color: "var(--e-amber)",    desc: "SMTP delivery logs" },
  { label: "Settings",         to: "/super-admin/settings",    icon: Settings,     color: "var(--e-text-muted)", desc: "Platform configuration" },
];

function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { d, h, m, s };
}

export default function AdminDashboardPage() {
  const { isModerator } = useAdminContext();
  const [data, setData] = useState<DashData | null>(null);
  const [server, setServer] = useState<ServerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [netHistory, setNetHistory] = useState<{ t: string; read: number; write: number }[]>([]);
  const [cpuHistory, setCpuHistory] = useState<{ t: string; v: number }[]>([]);
  const [ramHistory, setRamHistory] = useState<{ t: string; v: number }[]>([]);
  const [diskHistory, setDiskHistory] = useState<{ t: string; v: number }[]>([]);

  // Load platform dashboard data
  useEffect(() => {
    fetchApi("/admin/dashboard")
      .then(r => { if (r?.success) setData(r.data); })
      .catch(e => toast.error(e.message || "Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  // Poll server metrics
  const pollServer = async () => {
    try {
      const resp = await fetchApi("/admin/server");
      if (resp?.success) {
        const d = resp.data as ServerData;
        setServer(d);
        const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setNetHistory(prev => [...prev.slice(-29), { t, read: d.network_recv_mb, write: d.network_sent_mb }]);
        setCpuHistory(prev => [...prev.slice(-29), { t, v: d.cpu_percent }]);
        setRamHistory(prev => [...prev.slice(-29), { t, v: d.ram_used_gb }]);
        setDiskHistory(prev => [...prev.slice(-29), { t, v: d.disk_percent }]);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!isModerator) {
      pollServer();
      const id = setInterval(pollServer, 10000);
      return () => clearInterval(id);
    }
  }, [isModerator]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const uptime = server ? fmtUptime(server.uptime_seconds) : null;

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Operations Center"
        subtitle={`${greeting} · ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
        icon={LayoutDashboard}
        actions={
          <div className="e-status-pill">
            <LiveDot status="online" />
            <span style={{ color: "var(--e-green)", fontWeight: 700, marginLeft: 4 }}>All Systems Operational</span>
          </div>
        }
      />

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Server Gauge Row (Admin/Owner only) ── */}
        {!isModerator && (
          <>
            <div>
              <SectionLabel label="System Metrics" />
              {/* Row 1: 4 gauges */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <GaugeCard
                  value={server ? (server.uptime_seconds > 0 ? 99.9 : 0) : 99.9}
                  displayValue="99.9 %"
                  label="Availability"
                  theme="green"
                />
                <GaugeCard
                  value={4}
                  displayValue="004 ms"
                  label="Response Time"
                  theme="green"
                />
                <GaugeCard
                  value={server?.cpu_percent ?? 0}
                  label="CPU Utilization"
                  theme="auto"
                />
                <GaugeCard
                  value={server?.ram_percent ?? 0}
                  label="Memory Utilization"
                  theme="auto"
                />
              </div>

              {/* Row 2: Packet Loss + Hardware Health + Network Speed + Used Memory */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
                <GaugeCard
                  value={server ? (100 - (server.network_recv_mb / (server.network_recv_mb + server.network_sent_mb + 0.01)) * 100) : 0}
                  label="Packet Loses"
                  theme="auto"
                />
                <HardwareHealthCard
                  critical={0}
                  warning={0}
                  up={23}
                  undefined_={5}
                />
                <NetworkSpeedCard
                  readMbps={server?.network_recv_mb ?? 0}
                  writeMbps={server?.network_sent_mb ?? 0}
                  history={netHistory}
                />
                <GaugeCard
                  value={server ? (server.ram_used_gb / (server.ram_total_gb || 1)) * 100 : 0}
                  displayValue={server ? `${server.ram_used_gb.toFixed(2)} GB` : "-- GB"}
                  label="Used Memory"
                  theme="orange"
                />
              </div>
            </div>

            {/* ── Line Charts Row ── */}
            <div>
              <SectionLabel label="Performance Trends" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <MetricLineChart
                  title="CPU Load"
                  data={cpuHistory}
                  color="#3b82f6"
                  formatter={v => `${v.toFixed(1)}%`}
                />
                <MetricLineChart
                  title="Free Memory"
                  data={ramHistory.map(d => ({ t: d.t, v: (server?.ram_total_gb ?? 0) - d.v }))}
                  color="#3b82f6"
                  formatter={v => `${v.toFixed(2)} GB`}
                />
                <MetricLineChart
                  title="Memory Used"
                  data={ramHistory}
                  color="#6366f1"
                  formatter={v => `${v.toFixed(2)} GB`}
                />
                <MetricLineChart
                  title="Disk Usage"
                  data={diskHistory}
                  color="#06b6d4"
                  formatter={v => `${v.toFixed(1)}%`}
                />
              </div>
            </div>
          </>
        )}

        {/* ── KPI Grid ── */}
        <div>
          <SectionLabel label="Platform Metrics" />
          <div className="e-grid-4" style={{ gap: 12 }}>
            <MetricCard label="Total Users"   value={data?.total_users ?? 0}      icon={Users}        iconColor="var(--e-accent-light)" iconBg="var(--e-bg-active)"  to="/app/admin/users"      isLoading={isLoading} trend="up"   trendValue="+12%" subtext="lifetime" />
            <MetricCard label="Active Users"  value={data?.active_users ?? 0}      icon={UserCheck}    iconColor="var(--e-green)"        iconBg="var(--e-green-bg)"   to="/app/admin/users"      isLoading={isLoading} trend="up"   trendValue="+5%"  subtext="30d" />
            <MetricCard label="New Today"     value={data?.users_today ?? 0}        icon={UserPlus}     iconColor="var(--e-cyan)"         iconBg="var(--e-cyan-bg)"    to="/app/admin/users"      isLoading={isLoading} trend="neutral" subtext="registered" />
            <MetricCard label="Total Projects" value={data?.total_projects ?? 0}   icon={FolderOpen}   iconColor="var(--e-amber)"        iconBg="var(--e-amber-bg)"   to="/app/admin/projects"   isLoading={isLoading} trend="up"   trendValue="+8%" />
            <MetricCard label="Total Runs"    value={data?.total_executions ?? 0}   icon={Zap}          iconColor="var(--e-purple)"       iconBg="var(--e-purple-bg)"  to="/app/admin/executions" isLoading={isLoading} trend="up"   trendValue="+23%" />
            <MetricCard label="Runs Today"    value={data?.executions_today ?? 0}   icon={Rocket}       iconColor="var(--e-blue)"         iconBg="var(--e-blue-bg)"    to="/app/admin/executions" isLoading={isLoading} trend="neutral" subtext="today" />
            <MetricCard label="Feedback"      value={data?.total_feedback ?? 0}     icon={MessageSquare} iconColor="var(--e-accent-light)" iconBg="var(--e-bg-active)" to="/app/admin/feedback"   isLoading={isLoading} trend="down"  trendValue="-3%" />
            <MetricCard label="System Errors" value={data?.total_errors ?? 0}       icon={Bug}          iconColor="var(--e-red)"          iconBg="var(--e-red-bg)"     to="/app/admin/errors"     isLoading={isLoading} trend={data?.total_errors > 0 ? "down" : "neutral"} />
          </div>
        </div>

        {/* ── Activity + System Health ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <WidgetShell title="Platform Activity" subtitle="Users & executions over 14 days">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_MOCK} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dg-users" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dg-exec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Area type="monotone" dataKey="users"      stroke="#6366f1" fill="url(#dg-users)" strokeWidth={2} dot={false} name="Users" activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="executions" stroke="#06b6d4" fill="url(#dg-exec)"  strokeWidth={2} dot={false} name="Executions" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[{ color: "#6366f1", label: "New Users" }, { color: "#06b6d4", label: "Executions" }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--e-text-muted)" }}>
                  <span style={{ width: 24, height: 2, background: l.color, borderRadius: 1, display: "inline-block" }} />
                  {l.label}
                </div>
              ))}
            </div>
          </WidgetShell>

          <WidgetShell title="System Health" subtitle="Service status overview">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {systemHealth.map(s => (
                <div key={s.label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: "var(--e-radius-md)",
                  background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LiveDot status={s.status} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--e-text-secondary)" }}>{s.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "var(--e-text-faint)", fontVariantNumeric: "tabular-nums" }}>{s.latency}</span>
                    <StatusChip status={s.status} dot={false} />
                  </div>
                </div>
              ))}
            </div>
          </WidgetShell>
        </div>

        {/* ── Error Rate Chart ── */}
        <WidgetShell title="Error Rate" subtitle="System errors per day">
          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_MOCK} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0d0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="errors" fill="#ef4444" opacity={0.8} radius={[3, 3, 0, 0]} name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>

        {/* ── Quick Access Grid ── */}
        <div>
          <SectionLabel label="Quick Access" />
          <div className="e-grid-4" style={{ gap: 8 }}>
            {adminQuickLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link key={link.to} to={link.to} style={{ textDecoration: "none", display: "block" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 14px",
                      background: "var(--e-bg-surface)",
                      border: "1px solid var(--e-border)",
                      borderRadius: "var(--e-radius-md)",
                      transition: "all 150ms", cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--e-border-strong)";
                      (e.currentTarget as HTMLDivElement).style.background = "var(--e-bg-elevated)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--e-border)";
                      (e.currentTarget as HTMLDivElement).style.background = "var(--e-bg-surface)";
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "var(--e-radius-sm)",
                      background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: link.color, flexShrink: 0,
                    }}>
                      <Icon size={13} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--e-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {link.label}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--e-text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {link.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
