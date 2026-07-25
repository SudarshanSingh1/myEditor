import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { SecurityDashboardTab } from "./SecurityDashboardTab";
import { BlockedIPsTab } from "./BlockedIPsTab";
import { ClipboardList, RefreshCw, Shield, Maximize2 } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { EBadge } from "../../components/enterprise/PageHeader";
import { Modal } from "../../components/ui/Modal";

export default function AdminAuditPage() {
  const { isSuperAdmin } = useAdminContext();
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "events" | "blocked" | "permissions">("dashboard");
  const limit = 30;

  if (!isSuperAdmin) return <Navigate to="/403" replace />;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi(`/admin/audit?skip=${page * limit}&limit=${limit}`);
      if (resp?.success) { setLogs(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load audit logs"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const actionColor = (action: string): string => {
    if (action.includes("DELETE")) return "error";
    if (action.includes("CREATE")) return "online";
    if (action.includes("UPDATE") || action.includes("CHANGE")) return "warning";
    return "info";
  };

  const TABS = [
    { id: "dashboard", label: "Security Dashboard" },
    { id: "events",    label: "Audit Events" },
    { id: "blocked",   label: "Blocked IPs" },
  ];

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Audit Logs"
        subtitle={`${total.toLocaleString()} events recorded`}
        icon={ClipboardList}
        badge={<EBadge color="indigo">OWNER ONLY</EBadge>}
        actions={
          <button onClick={fetchData} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
            <RefreshCw size={12} />
            Refresh
          </button>
        }
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--e-border)", background: "var(--e-bg-surface)", padding: "0 24px" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 16px", fontSize: 13, fontWeight: 600,
              color: activeTab === tab.id ? "var(--e-text-primary)" : "var(--e-text-muted)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid var(--e-accent)" : "2px solid transparent",
              transition: "all 150ms", marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {activeTab === "dashboard" && <SecurityDashboardTab />}
        {activeTab === "blocked" && <BlockedIPsTab />}

        {activeTab === "events" && (
          <div className="e-table-wrapper">
            <table className="e-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  {["Timestamp", "Action", "User", "IP Address", "Details"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j}><div className="e-skeleton" style={{ height: 14, width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--e-text-faint)", fontSize: 13 }}>No audit events found.</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 11, color: "var(--e-text-faint)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`e-chip ${actionColor(log.action)}`} style={{ fontFamily: "monospace", fontSize: 10 }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: "var(--e-text-secondary)", fontSize: 13 }}>{log.username}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--e-text-faint)" }}>{log.ip_address || "—"}</td>
                    <td style={{ fontSize: 11, color: "var(--e-text-muted)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.details ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details)) : "—"}
                        </span>
                        {log.details && (
                          <button 
                            onClick={() => setSelectedDetails(typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2))}
                            className="e-btn" 
                            style={{ padding: 4, minWidth: 'auto', flexShrink: 0 }}
                          >
                            <Maximize2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Modal isOpen={!!selectedDetails} onClose={() => setSelectedDetails(null)} title="Audit Details">
              <div style={{ padding: 16 }}>
                <pre style={{ 
                  background: "var(--e-bg-base)", padding: 16, borderRadius: 8, 
                  fontSize: 12, overflowX: "auto", color: "var(--e-text-primary)",
                  border: "1px solid var(--e-border)",
                  whiteSpace: "pre-wrap", wordBreak: "break-all"
                }}>
                  {selectedDetails}
                </pre>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={() => setSelectedDetails(null)} className="e-btn e-btn-primary">Close</button>
                </div>
              </div>
            </Modal>

            {total > limit && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--e-border)", fontSize: 12, color: "var(--e-text-muted)" }}>
                <span>Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="e-btn e-btn-secondary e-btn-sm" style={{ opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
                  <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="e-btn e-btn-secondary e-btn-sm" style={{ opacity: (page + 1) * limit >= total ? 0.4 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
