import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import {
  Database, Users, FolderOpen, FileText, Zap, MessageSquare,
  Bug, ClipboardList, RefreshCw, HardDrive,
} from "lucide-react";
import {
  BarChart, Bar, Cell, PieChart, Pie, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { PageHeader } from "../../components/enterprise/PageHeader";

const TABLE_COLORS: Record<string, string> = {
  users:          "#4f46e5",
  projects:       "#d97706",
  execution_logs: "#db2777",
  system_errors:  "#dc2626",
  feedback:       "#16a34a",
  audit_logs:     "#0891b2",
  files:          "#7c3aed",
};
const TABLE_ICONS: Record<string, any> = {
  users: Users, projects: FolderOpen, files: FileText,
  execution_logs: Zap, feedback: MessageSquare, system_errors: Bug,
  audit_logs: ClipboardList,
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#ffffff", border: "1px solid #e2e8f0",
    borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", color: "#334155",
  },
  labelStyle: { color: "#64748b", fontWeight: 600 },
};

export default function AdminDatabasePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi("/admin/database");
      if (resp?.success) setData(resp.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load database info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, []);

  const card = {
    background: "var(--e-bg-surface)",
    border: "1px solid var(--e-border)",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  /* Build chart data from table_counts */
  const chartData = data
    ? Object.entries(data.table_counts || {}).map(([table, count]) => ({
        name: table.replace(/_/g, " "),
        count: count as number,
        color: TABLE_COLORS[table] || "#6366f1",
      }))
    : [];

  const pieData = data
    ? Object.entries(data.table_counts || {}).map(([table, count]) => ({
        name: table.replace(/_/g, " "),
        value: count as number,
        color: TABLE_COLORS[table] || "#6366f1",
      }))
    : [];

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Database Analytics"
        subtitle="PostgreSQL storage, table metrics, and row distribution"
        icon={Database}
        iconColor="#16a34a"
        actions={
          <button onClick={fetchData} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            background: "var(--e-bg-surface)", border: "1px solid var(--e-border)",
            borderRadius: 10, fontSize: 12, fontWeight: 600,
            color: "var(--e-text-secondary)", cursor: "pointer",
          }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        }
      />

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {loading && !data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[120, 280, 200].map((h, i) => (
              <div key={i} style={{ ...card, height: h, background: "var(--e-bg-elevated)" }} />
            ))}
          </div>
        ) : !data ? (
          <div style={{ ...card, textAlign: "center", padding: "48px 16px", color: "var(--e-text-faint)" }}>
            Failed to load database info.{" "}
            <button onClick={fetchData} style={{ color: "var(--e-accent)", fontWeight: 600, cursor: "pointer", background: "none", border: "none" }}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* ── Storage Banner ── */}
            <div style={{
              ...card,
              background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
              border: "1px solid #bbf7d0",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "24px 28px",
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#16a34a", marginBottom: 6 }}>
                  Total Allocated Storage
                </p>
                <p style={{ fontSize: 42, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {data.db_size || "N/A"}
                </p>
              </div>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <HardDrive size={26} style={{ color: "#16a34a" }} />
              </div>
            </div>

            {/* ── Info cards row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "PostgreSQL Version", value: data.db_version?.split(" ")[1] || "Unknown", color: "#4f46e5" },
                { label: "Active Connections", value: data.active_connections, color: "#2563eb" },
                { label: "Pool Status", value: data.pool_status, color: "#16a34a", dot: true },
                { label: "Migration Status", value: data.migration_status, color: "#0891b2", dot: true },
              ].map(item => (
                <div key={item.label} style={card}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-text-faint)", marginBottom: 8 }}>
                    {item.label}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {item.dot && <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />}
                    <p style={{ fontSize: 18, fontWeight: 700, color: item.color, letterSpacing: "-0.01em" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Table Counts Grid ── */}
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <ClipboardList size={16} style={{ color: "var(--e-text-muted)" }} />
                Table Row Distribution
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {Object.entries(data.table_counts || {}).map(([table, count]) => {
                  const Icon = TABLE_ICONS[table] || Database;
                  const color = TABLE_COLORS[table] || "#6366f1";
                  return (
                    <div key={table} style={{
                      ...card, display: "flex", alignItems: "center", gap: 12,
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: color + "14",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={15} style={{ color }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--e-text-faint)", marginBottom: 2 }}>
                          {table.replace(/_/g, " ")}
                        </p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: "var(--e-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                          {(count as number).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Analytics Charts ── */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
              {/* Bar chart */}
              <div style={card}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 4 }}>Row Count by Table</p>
                <p style={{ fontSize: 11, color: "var(--e-text-muted)", marginBottom: 14 }}>Live row distribution across all tables</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), "Rows"]} />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              <div style={card}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 4 }}>Storage Share</p>
                <p style={{ fontSize: 11, color: "var(--e-text-muted)", marginBottom: 10 }}>Proportional row count per table</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PieChart width={130} height={130} style={{ background: "transparent", flexShrink: 0 }}>
                    <Pie data={pieData} cx={65} cy={65} innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={2} stroke="none">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), "Rows"]} />
                  </PieChart>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {pieData.map(item => (
                      <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: "var(--e-text-secondary)", fontWeight: 500 }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--e-text-faint)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
