import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { useUserStore } from "../../stores/useUserStore";
import { toast } from "sonner";
import {
  Flag, MessageSquare, AlertCircle, Users, CheckCircle,
  Clock, Shield, TrendingUp, Eye,
} from "lucide-react";
import { BarChart, Bar, Cell, PieChart, Pie, Tooltip, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
    fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", color: "#334155",
  },
  labelStyle: { color: "#64748b", fontWeight: 600 },
};

const card: React.CSSProperties = {
  background: "var(--e-bg-surface)",
  border: "1px solid var(--e-border)",
  borderRadius: 14,
  padding: "16px 18px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

function StatCard({ icon: Icon, iconColor, label, value, sub }: {
  icon: any; iconColor: string; label: string; value: any; sub?: string;
}) {
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: iconColor + "15",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={17} style={{ color: iconColor }} />
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-text-faint)", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: "var(--e-text-primary)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {value ?? "—"}
        </p>
        {sub && <p style={{ fontSize: 10, color: "var(--e-text-faint)", marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
  );
}

export function ModeratorDashboard() {
  const { user } = useUserStore();
  const [reports, setReports]     = useState<any[]>([]);
  const [feedback, setFeedback]   = useState<any[]>([]);
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [r, f, u] = await Promise.allSettled([
          fetchApi("/admin/reports"),
          fetchApi("/admin/feedback"),
          fetchApi("/admin/users?limit=5&sort_by=created_at&sort_desc=true"),
        ]);
        if (r.status === "fulfilled" && r.value?.success) setReports(r.value.data?.items || r.value.data || []);
        if (f.status === "fulfilled" && f.value?.success) setFeedback(f.value.data?.items || f.value.data || []);
        if (u.status === "fulfilled" && u.value?.success) setUsers(u.value.data?.items || u.value.data || []);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const pendingReports  = reports.filter((r: any) => r.status === "pending" || r.status === "open").length;
  const resolvedReports = reports.filter((r: any) => r.status === "resolved" || r.status === "closed").length;
  const avgRating       = feedback.length
    ? (feedback.reduce((s: number, f: any) => s + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : "—";

  /* feedback rating distribution */
  const ratingDist = [1,2,3,4,5].map(r => ({
    rating: `⭐${r}`, count: feedback.filter((f: any) => f.rating === r).length,
    color: ["#dc2626","#ea580c","#d97706","#16a34a","#0891b2"][r - 1],
  }));

  /* report status pie */
  const statusPie = [
    { name: "Pending",  value: pendingReports,  color: "#ea580c" },
    { name: "Resolved", value: resolvedReports,  color: "#16a34a" },
    { name: "Other",    value: Math.max(0, reports.length - pendingReports - resolvedReports), color: "#6366f1" },
  ].filter(x => x.value > 0);

  if (loading) {
    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[60, 60, 200].map((h, i) => <div key={i} style={{ ...card, height: h, background: "var(--e-bg-elevated)" }} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Role Badge ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
        border: "1px solid #ddd6fe", borderRadius: 14, padding: "14px 20px",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {user?.username?.slice(0, 2).toUpperCase() || "M"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>{user?.username || "Moderator"}</p>
            <span style={{
              background: "#4f46e5", color: "#fff", fontSize: 9, fontWeight: 800,
              padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.08em",
            }}>Moderator</span>
          </div>
          <p style={{ fontSize: 11, color: "#6d28d9", marginTop: 2 }}>
            <Shield size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Community moderation · Reports &amp; Feedback access
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>Active</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard icon={Flag}         iconColor="#ea580c" label="Pending Reports"   value={pendingReports}   sub="awaiting review" />
        <StatCard icon={CheckCircle}  iconColor="#16a34a" label="Resolved"          value={resolvedReports}  sub="reports closed" />
        <StatCard icon={MessageSquare} iconColor="#0891b2" label="Total Feedback"   value={feedback.length}  sub="submissions" />
        <StatCard icon={TrendingUp}   iconColor="#7c3aed" label="Avg Rating"        value={avgRating}        sub="out of 5.0" />
      </div>

      {/* ── Charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        {/* Feedback Rating Bar */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 2 }}>Feedback Rating Distribution</p>
          <p style={{ fontSize: 11, color: "var(--e-text-muted)", marginBottom: 14 }}>User satisfaction scores breakdown</p>
          {feedback.length === 0 ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--e-text-faint)", fontSize: 13 }}>
              No feedback data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ratingDist} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="rating" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickCount={4} width={30} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v, "Responses"]} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {ratingDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Report Status Pie */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 2 }}>Report Status</p>
          <p style={{ fontSize: 11, color: "var(--e-text-muted)", marginBottom: 10 }}>Pending vs resolved</p>
          {reports.length === 0 ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--e-text-faint)", fontSize: 13 }}>
              No reports yet
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <PieChart width={120} height={120} style={{ background: "transparent", flexShrink: 0 }}>
                <Pie data={statusPie} cx={60} cy={60} innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={2} stroke="none">
                  {statusPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {statusPie.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "var(--e-text-secondary)" }}>{d.name}</span>
                    <span style={{ fontSize: 11, color: "var(--e-text-faint)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Users & Feedback ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent Feedback */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageSquare size={14} style={{ color: "#0891b2" }} /> Recent Feedback
          </p>
          {feedback.slice(0, 5).length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--e-text-faint)", padding: "20px 0", textAlign: "center" }}>No feedback</p>
          ) : feedback.slice(0, 5).map((f: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--e-border)" : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 10, fontWeight: 700,
              }}>{f.username?.slice(0, 2).toUpperCase() || "U"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--e-text-primary)", marginBottom: 1 }}>{f.username || "User"}</p>
                <p style={{ fontSize: 11, color: "var(--e-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.comment || "No comment"}
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", flexShrink: 0 }}>⭐{f.rating || "—"}</span>
            </div>
          ))}
        </div>

        {/* Recent Users */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} style={{ color: "#4f46e5" }} /> Recent Users
          </p>
          {users.slice(0, 5).length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--e-text-faint)", padding: "20px 0", textAlign: "center" }}>No users</p>
          ) : users.slice(0, 5).map((u: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--e-border)" : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 10, fontWeight: 700,
              }}>{u.username?.slice(0, 2).toUpperCase() || "U"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--e-text-primary)", marginBottom: 1 }}>{u.username}</p>
                <p style={{ fontSize: 10, color: "var(--e-text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.is_active ? "#16a34a" : "#94a3b8" }} />
                <span style={{ fontSize: 10, color: "var(--e-text-faint)" }}>{u.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending Reports ── */}
      {reports.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} style={{ color: "#ea580c" }} /> Pending Reports
            {pendingReports > 0 && (
              <span style={{ background: "#ea580c", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100, marginLeft: 4 }}>
                {pendingReports}
              </span>
            )}
          </p>
          {reports.filter((r: any) => r.status === "pending" || r.status === "open").slice(0, 5).map((r: any, i: number, arr) => (
            <div key={r.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--e-border)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Flag size={14} style={{ color: "#ea580c" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--e-text-primary)", marginBottom: 2 }}>{r.title || r.reason || "Report"}</p>
                <p style={{ fontSize: 10, color: "var(--e-text-faint)" }}>By {r.reporter_username || "Unknown"}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={11} style={{ color: "#94a3b8" }} />
                <span style={{ fontSize: 10, color: "var(--e-text-faint)" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#ea580c", background: "#fff7ed", padding: "2px 8px", borderRadius: 100 }}>
                PENDING
              </span>
            </div>
          ))}
          {pendingReports === 0 && (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--e-text-faint)", fontSize: 13 }}>
              <CheckCircle size={20} style={{ color: "#16a34a", margin: "0 auto 6px" }} />
              All reports resolved!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
