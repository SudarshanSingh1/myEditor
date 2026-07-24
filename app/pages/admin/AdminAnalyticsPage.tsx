import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line
} from "recharts";
import {
  BarChart3, Download, TrendingUp, Zap, Users, CheckCircle2,
  XCircle, Clock, HardDrive, Database, FolderOpen, Search, RefreshCw
} from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { WidgetShell } from "../../components/enterprise/WidgetShell";
import { MetricCard } from "../../components/enterprise/MetricCard";

/* ── debounce ──────────────────────────────────────────────────── */
function useDebounceValue<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const h = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return dv;
}

/* ── colour palettes ────────────────────────────────────────────── */
const PIE_COLORS   = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6"];
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0d0e1a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, fontSize: 12, color: "#f1f5f9", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  labelStyle: { color: "#94a3b8", marginBottom: 4 },
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/* ── Chart card helper ──────────────────────────────────────────── */
function ChartCard({ title, subtitle, children, height = 240 }: {
  title: string; subtitle?: string; children: React.ReactNode; height?: number;
}) {
  return (
    <div className="e-widget" style={{ padding: 0 }}>
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--e-border)" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)" }}>{title}</p>
        {subtitle && <p style={{ fontSize: 11, color: "var(--e-text-faint)", marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: "14px 12px 12px", height }}>
        {children}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "compiler" | "storage">("general");
  const [loading, setLoading] = useState(true);

  // General
  const [timeline, setTimeline]       = useState<any[]>([]);
  const [languages, setLanguages]     = useState<any[]>([]);
  const [statusRatio, setStatusRatio] = useState<any[]>([]);
  const [feedback, setFeedback]       = useState<any[]>([]);

  // Compiler
  const [compilerDash, setCompilerDash]     = useState<any>(null);
  const [compilerCharts, setCompilerCharts] = useState<any>(null);
  const [compilerFilters, setCompilerFilters] = useState({ search: "", status: "", language: "" });
  const debouncedSearch = useDebounceValue(compilerFilters.search, 500);

  // Storage
  const [storageDash, setStorageDash]       = useState<any>(null);
  const [storageCharts, setStorageCharts]   = useState<any>(null);
  const [largestProjects, setLargestProjects] = useState<any[]>([]);
  const [largestUsers, setLargestUsers]     = useState<any[]>([]);

  /* -- fetch functions -- */
  const fetchGeneral = async () => {
    try {
      const [t, l, s, f] = await Promise.all([
        fetchApi("/admin/analytics/master-timeline"),
        fetchApi("/admin/analytics/languages"),
        fetchApi("/admin/analytics/execution-status"),
        fetchApi("/admin/analytics/feedback-ratings"),
      ]);
      if (t?.success) setTimeline(t.data.items || []);
      if (l?.success) setLanguages(l.data.items || []);
      if (s?.success) setStatusRatio(s.data.items || []);
      if (f?.success) setFeedback(f.data.items || []);
    } catch (e) { console.error(e); }
  };

  const fetchCompiler = useCallback(async () => {
    try {
      const [dash, charts] = await Promise.all([
        fetchApi("/admin/executions/dashboard"),
        fetchApi(`/admin/analytics/compiler/charts?search=${debouncedSearch}&status=${compilerFilters.status}&language=${compilerFilters.language}`),
      ]);
      if (dash?.success) setCompilerDash(dash.data);
      if (charts?.success) setCompilerCharts(charts.data);
    } catch (e) { console.error(e); }
  }, [debouncedSearch, compilerFilters.status, compilerFilters.language]);

  const fetchStorage = async () => {
    try {
      const [dash, charts, proj, users] = await Promise.all([
        fetchApi("/admin/analytics/storage/dashboard"),
        fetchApi("/admin/analytics/storage/charts"),
        fetchApi("/admin/analytics/storage/largest-projects"),
        fetchApi("/admin/analytics/storage/largest-users"),
      ]);
      if (dash?.success) setStorageDash(dash.data);
      if (charts?.success) setStorageCharts(charts.data);
      if (proj?.success) setLargestProjects(proj.data.items || []);
      if (users?.success) setLargestUsers(users.data.items || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setLoading(true);
    const fn =
      activeTab === "general" ? fetchGeneral :
      activeTab === "compiler" ? fetchCompiler :
      fetchStorage;
    fn().finally(() => setLoading(false));
  }, [activeTab, fetchCompiler]);

  const handleExport = (type: string, format: string) =>
    (window.location.href = `/api/v1/admin/analytics/export?type=${type}&format=${format}`);

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      {/* ── Page Header ── */}
      <PageHeader
        title="Analytics Center"
        subtitle="Platform growth, compiler performance, and storage intelligence"
        icon={BarChart3}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Tab switcher */}
            <div style={{
              display: "flex", background: "var(--e-bg-elevated)",
              border: "1px solid var(--e-border)", borderRadius: "var(--e-radius-md)", padding: 3, gap: 2,
            }}>
              {(["general", "compiler", "storage"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "5px 14px", fontSize: 12, fontWeight: 600,
                    borderRadius: "var(--e-radius-sm)", border: "none", cursor: "pointer",
                    background: activeTab === tab ? "var(--e-bg-active)" : "transparent",
                    color: activeTab === tab ? "var(--e-accent-light)" : "var(--e-text-muted)",
                    transition: "all 150ms", textTransform: "capitalize",
                  }}
                >
                  {tab === "general" ? "Overview" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {/* Export dropdown */}
            <div style={{ position: "relative" }} className="group">
              <button className="e-btn e-btn-secondary" style={{ gap: 6 }}>
                <Download size={12} /> Export
              </button>
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)", width: 200,
                background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
                borderRadius: "var(--e-radius-lg)", boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                zIndex: 60, overflow: "hidden",
                opacity: 0, pointerEvents: "none", transition: "opacity 150ms",
              }} className="group-hover:opacity-100 group-hover:pointer-events-auto">
                <div style={{ padding: 8 }}>
                  {[
                    { label: "Compiler Data", type: "compiler" },
                    { label: "Storage Data",  type: "storage" },
                  ].map(({ label, type }) => (
                    <div key={type}>
                      <p style={{ padding: "4px 10px", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-text-faint)" }}>{label}</p>
                      <button onClick={() => handleExport(type, "json")} className="e-btn e-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: 12 }}>Export JSON</button>
                      <button onClick={() => handleExport(type, "csv")}  className="e-btn e-btn-ghost" style={{ width: "100%", justifyContent: "flex-start", fontSize: 12 }}>Export CSV</button>
                      {type === "compiler" && <div style={{ height: 1, background: "var(--e-border)", margin: "4px 0" }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        }
      />

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Loading Skeletons ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="e-skeleton" style={{ height: 88, borderRadius: "var(--e-radius-lg)" }} />
              ))}
            </div>
            <div className="e-skeleton" style={{ height: 280, borderRadius: "var(--e-radius-lg)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="e-skeleton" style={{ height: 240, borderRadius: "var(--e-radius-lg)" }} />
              <div className="e-skeleton" style={{ height: 240, borderRadius: "var(--e-radius-lg)" }} />
            </div>
          </div>
        )}

        {/* ══════════════ GENERAL / OVERVIEW TAB ══════════════ */}
        {!loading && activeTab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Summary KPIs computed from timeline */}
            <div className="e-grid-4" style={{ gap: 12 }}>
              <MetricCard
                label="Total Users"
                value={timeline.length ? timeline[timeline.length - 1]?.users ?? 0 : 0}
                icon={Users} iconColor="var(--e-accent-light)" iconBg="var(--e-bg-active)"
                trend="up" trendValue="+12%"
              />
              <MetricCard
                label="Total Executions"
                value={timeline.reduce((a: number, d: any) => a + (d.executions ?? 0), 0)}
                icon={Zap} iconColor="var(--e-cyan)" iconBg="var(--e-cyan-bg)"
                trend="up" trendValue="+23%"
              />
              <MetricCard
                label="Completion Rate"
                value={`${statusRatio.length ? Math.round((statusRatio.find((s: any) => s.status === "completed")?.count / statusRatio.reduce((a: any, b: any) => a + b.count, 0)) * 100) || 0 : 0}%`}
                icon={CheckCircle2} iconColor="var(--e-green)" iconBg="var(--e-green-bg)"
                trend="up" trendValue="+5%"
              />
              <MetricCard
                label="Languages Used"
                value={languages.length}
                icon={BarChart3} iconColor="var(--e-purple)" iconBg="var(--e-purple-bg)"
                trend="neutral" subtext="distinct"
              />
            </div>

            {/* Master Timeline Chart */}
            <ChartCard
              title="Master Activity Timeline"
              subtitle={`${timeline.length} days of platform data`}
              height={280}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ag-users" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ag-exec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ag-err" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="users"      stroke="#6366f1" fill="url(#ag-users)" strokeWidth={2} dot={false} name="New Users" />
                  <Area type="monotone" dataKey="executions" stroke="#06b6d4" fill="url(#ag-exec)"  strokeWidth={2} dot={false} name="Executions" />
                  <Area type="monotone" dataKey="errors"     stroke="#ef4444" fill="url(#ag-err)"   strokeWidth={1.5} dot={false} name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 20, paddingTop: 8 }}>
                {[
                  { c: "#6366f1", l: "New Users" },
                  { c: "#06b6d4", l: "Executions" },
                  { c: "#ef4444", l: "Errors" },
                ].map(i => (
                  <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--e-text-muted)" }}>
                    <span style={{ width: 20, height: 2, background: i.c, borderRadius: 1, display: "inline-block" }} />
                    {i.l}
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Language Distribution + Status Ratio */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <ChartCard title="Language Distribution" subtitle="Top languages by execution count" height={220}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languages.slice(0, 8)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="language" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Executions">
                      {languages.slice(0, 8).map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Execution Status Breakdown" subtitle="Success vs failure vs pending" height={220}>
                <div style={{ display: "flex", height: "100%", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: "0 0 180px" }}>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={statusRatio}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={80}
                          dataKey="count" nameKey="status"
                          strokeWidth={0}
                        >
                          {statusRatio.map((_: any, i: number) => (
                            <Cell key={i} fill={
                              statusRatio[i]?.status === "completed" ? "#10b981" :
                              statusRatio[i]?.status === "failed"    ? "#ef4444" :
                              statusRatio[i]?.status === "running"   ? "#06b6d4" : "#6366f1"
                            } />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), "Count"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                    {statusRatio.map((s: any, i: number) => {
                      const total = statusRatio.reduce((a: number, b: any) => a + b.count, 0);
                      const pct   = total > 0 ? Math.round((s.count / total) * 100) : 0;
                      const color =
                        s.status === "completed" ? "#10b981" :
                        s.status === "failed"    ? "#ef4444" :
                        s.status === "running"   ? "#06b6d4" : "#6366f1";
                      return (
                        <div key={s.status}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: "var(--e-text-secondary)", textTransform: "capitalize" }}>{s.status}</span>
                            <span style={{ color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                          </div>
                          <div className="e-progress">
                            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 800ms" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Feedback Ratings */}
            {feedback.length > 0 && (
              <ChartCard title="Feedback Ratings Distribution" subtitle="User satisfaction scores" height={180}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feedback} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="rating" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Responses" radius={[4, 4, 0, 0]}>
                      {feedback.map((_: any, i: number) => (
                        <Cell key={i} fill={["#ef4444","#f59e0b","#f59e0b","#10b981","#10b981"][i] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        )}

        {/* ══════════════ COMPILER TAB ══════════════ */}
        {!loading && activeTab === "compiler" && compilerDash && compilerCharts && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* KPI Cards */}
            <div className="e-grid-4" style={{ gap: 12 }}>
              <MetricCard
                label="Total Executions"
                value={(compilerDash.running_executions ?? 0) + (compilerDash.completed_executions ?? 0) + (compilerDash.failed_executions ?? 0)}
                icon={Zap} iconColor="var(--e-accent-light)" iconBg="var(--e-bg-active)"
              />
              <MetricCard
                label="Success Rate"
                value={`${compilerDash.success_rate ?? 0}%`}
                icon={CheckCircle2} iconColor="var(--e-green)" iconBg="var(--e-green-bg)"
                trend="up"
              />
              <MetricCard
                label="Failure Rate"
                value={`${compilerDash.failure_rate ?? 0}%`}
                icon={XCircle} iconColor="var(--e-red)" iconBg="var(--e-red-bg)"
                trend="down"
              />
              <MetricCard
                label="Avg Runtime"
                value={`${compilerDash.average_runtime_ms ?? 0}ms`}
                icon={Clock} iconColor="var(--e-cyan)" iconBg="var(--e-cyan-bg)"
              />
            </div>

            {/* Filters row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div className="e-search" style={{ flex: 1, minWidth: 200 }}>
                <Search size={13} color="var(--e-text-faint)" />
                <input
                  type="text"
                  placeholder="Search by user or project..."
                  value={compilerFilters.search}
                  onChange={e => setCompilerFilters({ ...compilerFilters, search: e.target.value })}
                />
              </div>
              {[
                { key: "status",   options: ["", "running", "completed", "failed"], placeholder: "All Statuses" },
                { key: "language", options: ["", "python", "javascript", "c", "cpp", "java"], placeholder: "All Languages" },
              ].map(f => (
                <select
                  key={f.key}
                  value={compilerFilters[f.key as keyof typeof compilerFilters]}
                  onChange={e => setCompilerFilters({ ...compilerFilters, [f.key]: e.target.value })}
                  style={{
                    background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
                    borderRadius: "var(--e-radius-md)", padding: "7px 12px",
                    fontSize: 12, color: "var(--e-text-secondary)", outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="" style={{ background: "#0d0e1a" }}>{f.placeholder}</option>
                  {f.options.filter(o => o).map(o => (
                    <option key={o} value={o} style={{ background: "#0d0e1a" }}>{o}</option>
                  ))}
                </select>
              ))}
            </div>

            {/* Charts 2-col grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <ChartCard title="Runtime Trend (30 Days)" subtitle="Avg execution time in ms" height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={compilerCharts.runtime_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ag-rt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="runtime" stroke="#06b6d4" fill="url(#ag-rt)" strokeWidth={2} dot={false} name="Avg Runtime (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Runtime Distribution" subtitle="Executions per time bucket" height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compilerCharts.runtime_distribution} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="bucket" type="category" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#8b5cf6" name="Executions" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Users by Executions" subtitle="Most active users" height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compilerCharts.top_users} margin={{ top: 4, right: 4, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="user" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#6366f1" name="Executions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Projects by Executions" subtitle="Most executed projects" height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compilerCharts.top_projects} margin={{ top: 4, right: 4, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="project" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#10b981" name="Executions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ══════════════ STORAGE TAB ══════════════ */}
        {!loading && activeTab === "storage" && storageDash && storageCharts && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Storage KPIs */}
            <div className="e-grid-4" style={{ gap: 12 }}>
              <MetricCard label="Total Capacity" value={formatBytes(storageDash.total_storage_bytes)}   icon={HardDrive} iconColor="var(--e-text-muted)"   iconBg="var(--e-bg-elevated)" />
              <MetricCard label="Used Storage"   value={formatBytes(storageDash.used_storage_bytes)}    icon={Database}  iconColor="var(--e-blue)"         iconBg="var(--e-blue-bg)"     trend="up" />
              <MetricCard label="Available"      value={formatBytes(storageDash.available_storage_bytes)} icon={CheckCircle2} iconColor="var(--e-green)"   iconBg="var(--e-green-bg)"   />
              <MetricCard label="Database Size"  value={formatBytes(storageDash.database_size_bytes)}   icon={Database}  iconColor="var(--e-purple)"       iconBg="var(--e-purple-bg)"  />
            </div>

            <div className="e-grid-4" style={{ gap: 12 }}>
              <MetricCard label="Object Storage" value={formatBytes(storageDash.object_storage_bytes)} icon={FolderOpen} iconColor="var(--e-amber)"  iconBg="var(--e-amber-bg)" />
              <MetricCard label="Logs Storage"   value={formatBytes(storageDash.logs_storage_bytes)}   icon={HardDrive}  iconColor="var(--e-cyan)"   iconBg="var(--e-cyan-bg)" />
              <MetricCard label="Backup Storage" value={formatBytes(storageDash.backups_storage_bytes)} icon={HardDrive} iconColor="var(--e-accent-light)" iconBg="var(--e-bg-active)" />
              <div />
            </div>

            {/* Charts 2-col */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <ChartCard title="Storage Growth (30 Days)" subtitle="Cumulative size over time" height={240}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={storageCharts.growth_trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ag-sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatBytes(v)} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [formatBytes(v), "Size"]} />
                    <Area type="monotone" dataKey="bytes" stroke="#f59e0b" fill="url(#ag-sg)" strokeWidth={2} dot={false} name="Storage" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="By File Type" subtitle="Storage breakdown" height={240}>
                <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
                  <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={storageCharts.storage_by_type}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={70}
                          dataKey="bytes" nameKey="type" strokeWidth={0}
                        >
                          {storageCharts.storage_by_type.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [formatBytes(v), "Size"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {storageCharts.storage_by_type.slice(0, 4).map((s: any, i: number) => (
                      <div key={s.type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: "var(--e-text-secondary)", flex: 1 }}>{s.type}</span>
                        <span style={{ color: "var(--e-text-faint)", fontVariantNumeric: "tabular-nums" }}>{formatBytes(s.bytes)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Tables */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { title: "Largest Projects", data: largestProjects, cols: ["project", "owner", "size_bytes"] as const },
                { title: "Largest Users",    data: largestUsers,    cols: ["user", "projects", "storage_bytes"] as const },
              ].map(({ title, data, cols }) => (
                <div key={title} className="e-table-wrapper">
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--e-border)" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)" }}>{title}</p>
                  </div>
                  <table className="e-table">
                    <thead>
                      <tr>
                        {cols.map(c => (
                          <th key={c} style={{ textAlign: c === "size_bytes" || c === "storage_bytes" ? "right" : "left" }}>
                            {c === "size_bytes" || c === "storage_bytes" ? "Size" : c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--e-text-faint)", padding: "20px 0" }}>No data</td></tr>
                      ) : data.map((row: any, i: number) => (
                        <tr key={i}>
                          {cols.map(c => (
                            <td key={c} style={{
                              textAlign: c === "size_bytes" || c === "storage_bytes" ? "right" : "left",
                              fontVariantNumeric: "tabular-nums",
                              color: c === "size_bytes" || c === "storage_bytes" ? "var(--e-amber)" : undefined,
                              fontWeight: c === "size_bytes" || c === "storage_bytes" ? 700 : undefined,
                            }}>
                              {c === "size_bytes" || c === "storage_bytes" ? formatBytes(row[c]) : row[c] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when data missing */}
        {!loading && activeTab === "compiler" && (!compilerDash || !compilerCharts) && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--e-text-faint)" }}>
            <BarChart3 size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No compiler data available.</p>
          </div>
        )}
        {!loading && activeTab === "storage" && (!storageDash || !storageCharts) && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--e-text-faint)" }}>
            <HardDrive size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No storage data available.</p>
          </div>
        )}

      </div>
    </div>
  );
}
