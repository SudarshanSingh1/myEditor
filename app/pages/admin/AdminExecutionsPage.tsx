import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { ExecutionDetailsDrawer } from "./ExecutionDetailsDrawer";
import { Modal } from "../../components/ui/Modal";
import { Settings, Play, Server, Clock, Activity, AlertTriangle, CheckCircle, Database, Eye, Maximize2 } from "lucide-react";

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/* ── Light theme style helpers ─────────────────────────────────── */
const card = {
  background: "var(--e-bg-surface)",
  border: "1px solid var(--e-border)",
  borderRadius: 12,
  padding: "14px 16px",
};
const inputStyle: React.CSSProperties = {
  background: "var(--e-bg-elevated)",
  border: "1px solid var(--e-border)",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  color: "var(--e-text-primary)",
  outline: "none",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};
const theadRow: React.CSSProperties = {
  background: "var(--e-bg-elevated)",
  borderBottom: "1px solid var(--e-border)",
};
const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--e-text-muted)",
  whiteSpace: "nowrap",
  cursor: "pointer",
};
const tdBase: React.CSSProperties = {
  padding: "9px 14px",
  borderBottom: "1px solid var(--e-border)",
  fontSize: 12,
  color: "var(--e-text-secondary)",
};

/* ── Status chip ─────────────────────────────────────────────── */
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  SUCCESS:       { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  FAILED:        { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  COMPILE_ERROR: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  RUNTIME_ERROR: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  SYSTEM_ERROR:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  TIMEOUT:       { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  RUNNING:       { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  QUEUED:        { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  CANCELLED:     { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
};

function StatusChipExec({ raw }: { raw: string }) {
  const key = raw.replace("ExecutionStatus.", "").toUpperCase();
  const s = STATUS_STYLE[key] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  const label = key.replace(/_/g, " ");
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

export default function AdminExecutionsPage() {
  const [activeTab, setActiveTab] = useState<'executions' | 'audit'>('executions');
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 30;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounceValue(search, 500);
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedAuditDetails, setSelectedAuditDetails] = useState<string | null>(null);

  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const debouncedAuditSearch = useDebounceValue(auditSearch, 500);

  const fetchDashboard = async () => {
    try {
      const resp = await fetchApi("/admin/executions/dashboard");
      if (resp?.success) setDashboardStats(resp.data);
    } catch (e) { console.error(e); }
  };

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * limit), limit: String(limit),
        sort_by: sortBy, sort_desc: String(sortDesc),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status) params.set("status", status);
      if (language) params.set("language", language);
      const resp = await fetchApi(`/admin/executions?${params}`);
      if (resp?.success) { setItems(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load executions"); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, status, language, sortBy, sortDesc]);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(auditPage * limit), limit: String(limit) });
      if (debouncedAuditSearch) params.set("search", debouncedAuditSearch);
      const resp = await fetchApi(`/admin/executions/audit?${params}`);
      if (resp?.success) { setAuditItems(resp.data.items || []); setAuditTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load audits"); }
    finally { setAuditLoading(false); }
  }, [auditPage, debouncedAuditSearch]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'executions') fetchExecutions();
    else fetchAudit();
  }, [fetchExecutions, fetchAudit, activeTab]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDesc(!sortDesc);
    else { setSortBy(col); setSortDesc(true); }
  };

  /* ── Stat card ── */
  const StatCard = ({ icon: Icon, iconColor, label, value }: { icon: any; iconColor: string; label: string; value: any }) => (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: iconColor + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-text-faint)", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--e-text-primary)", fontVariantNumeric: "tabular-nums" }}>
          {value ?? "—"}
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--e-text-primary)", letterSpacing: "-0.01em" }}>Execution Operations Center</h1>
          <p style={{ fontSize: 13, color: "var(--e-text-muted)", marginTop: 2 }}>Monitor, manage, and audit code executions.</p>
        </div>
        <div style={{
          display: "flex", background: "var(--e-bg-surface)", border: "1px solid var(--e-border)",
          borderRadius: 10, padding: 4, gap: 2
        }}>
          {(['executions', 'audit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "5px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "none", transition: "all 150ms",
              background: activeTab === tab ? "var(--e-accent)" : "transparent",
              color: activeTab === tab ? "#fff" : "var(--e-text-muted)",
            }}>
              {tab === 'executions' ? 'Operations' : 'Audit Logs'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'executions' && (
        <>
          {/* Top stat cards — Row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <StatCard icon={Activity} iconColor="#16a34a" label="Queue Status" value={dashboardStats?.live_queue_status} />
            <StatCard icon={Server}   iconColor="#2563eb" label="Active Workers" value={dashboardStats?.running_workers} />
            <StatCard icon={Clock}    iconColor="#d97706" label="Avg Runtime" value={dashboardStats?.average_runtime_ms !== undefined ? `${dashboardStats.average_runtime_ms}ms` : undefined} />
            <StatCard icon={Database} iconColor="#7c3aed" label="Queue Length" value={dashboardStats?.queue_length} />
          </div>
          {/* Row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--e-text-faint)", marginBottom: 4 }}>Success Rate</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }}>{dashboardStats?.success_rate ?? "—"}%</p>
              </div>
              <CheckCircle size={22} style={{ color: "#16a34a", opacity: 0.3 }} />
            </div>
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--e-text-faint)", marginBottom: 4 }}>Failure Rate</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>{dashboardStats?.failure_rate ?? "—"}%</p>
              </div>
              <AlertTriangle size={22} style={{ color: "#dc2626", opacity: 0.3 }} />
            </div>
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--e-text-faint)", marginBottom: 4 }}>Running</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#2563eb" }}>{dashboardStats?.running_executions ?? "—"}</p>
              </div>
              <Play size={22} style={{ color: "#2563eb", opacity: 0.3 }} />
            </div>
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--e-text-faint)", marginBottom: 4 }}>Active Containers</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#7c3aed" }}>{dashboardStats?.active_containers ?? "—"}</p>
              </div>
              <Server size={22} style={{ color: "#7c3aed", opacity: 0.3 }} />
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <input type="text" placeholder="Search by user or project..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ ...inputStyle, flex: "1 1 220px", maxWidth: 320 }}
            />
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} style={selectStyle}>
              <option value="">All Statuses</option>
              <option value="Queued">Queued</option>
              <option value="Running">Running</option>
              <option value="Success">Success</option>
              <option value="Compile Error">Compile Error</option>
              <option value="Runtime Error">Runtime Error</option>
              <option value="Timeout">Timeout</option>
              <option value="System Error">System Error</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select value={language} onChange={e => { setLanguage(e.target.value); setPage(0); }} style={selectStyle}>
              <option value="">All Languages</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="c">C</option>
              <option value="c++">C++</option>
              <option value="java">Java</option>
            </select>
            <button onClick={() => fetchExecutions()} style={{
              ...inputStyle, cursor: "pointer", fontWeight: 600, color: "var(--e-text-secondary)", flexShrink: 0,
            }}>Refresh</button>
          </div>

          {/* Table */}
          <div style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
                <thead>
                  <tr style={theadRow}>
                    {[
                      { k: 'created_at', l: 'Timestamp' }, { k: 'user', l: 'User' },
                      { k: 'project', l: 'Project' }, { k: 'language', l: 'Language' },
                      { k: 'status', l: 'Status' }, { k: 'execution_time_ms', l: 'Runtime' },
                    ].map(h => (
                      <th key={h.k} onClick={() => handleSort(h.k)} style={thStyle}>
                        {h.l} {sortBy === h.k && (sortDesc ? '↓' : '↑')}
                      </th>
                    ))}
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={tdBase}><div style={{ height: 14, background: "var(--e-border)", borderRadius: 4 }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...tdBase, textAlign: "center", padding: "40px 16px", color: "var(--e-text-faint)" }}>
                        No executions found.
                      </td>
                    </tr>
                  ) : items.map(item => (
                    <tr key={item.id} style={{ transition: "background 100ms" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--e-bg-elevated)"}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                    >
                      <td style={{ ...tdBase, color: "var(--e-text-faint)", fontSize: 11 }}>{new Date(item.created_at).toLocaleString()}</td>
                      <td style={{ ...tdBase, fontWeight: 500, color: "var(--e-text-primary)" }}>{item.username}</td>
                      <td style={tdBase}>{item.project_name}</td>
                      <td style={tdBase}>
                        <span style={{
                          background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe",
                          borderRadius: 100, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                        }}>{item.language || "—"}</span>
                      </td>
                      <td style={tdBase}>
                        <StatusChipExec raw={item.status || ""} />
                      </td>
                      <td style={{ ...tdBase, color: "var(--e-text-muted)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                        {item.duration_ms ? `${item.duration_ms}ms` : "—"}
                      </td>
                      <td style={tdBase}>
                        <button onClick={() => setSelectedExecutionId(item.id)} style={{
                          display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
                          padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                          background: "var(--e-bg-elevated)", color: "var(--e-text-secondary)",
                          border: "1px solid var(--e-border)", transition: "all 150ms",
                        }}>
                          <Settings size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > limit && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--e-border)" }}>
                <p style={{ fontSize: 11, color: "var(--e-text-muted)" }}>
                  Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ ...inputStyle, cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1 }}>Previous</button>
                  <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} style={{ ...inputStyle, cursor: (page + 1) * limit >= total ? "not-allowed" : "pointer", opacity: (page + 1) * limit >= total ? 0.4 : 1 }}>Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'audit' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="text" placeholder="Search by user..." value={auditSearch}
              onChange={e => { setAuditSearch(e.target.value); setAuditPage(0); }}
              style={{ ...inputStyle, flex: "1 1 220px", maxWidth: 320 }}
            />
            <button onClick={() => fetchAudit()} style={{ ...inputStyle, cursor: "pointer", fontWeight: 600, color: "var(--e-text-secondary)", flexShrink: 0 }}>Refresh</button>
          </div>

          <div style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
                <thead>
                  <tr style={theadRow}>
                    {["Timestamp", "User", "Action", "IP Address", "Details"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} style={tdBase}><div style={{ height: 14, background: "var(--e-border)", borderRadius: 4 }} /></td>)}</tr>
                    ))
                  ) : auditItems.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...tdBase, textAlign: "center", padding: "40px 16px", color: "var(--e-text-faint)" }}>No audit logs found.</td></tr>
                  ) : auditItems.map(item => {
                    const execId = item.details?.execution_id || item.details?.id;
                    return (
                      <tr key={item.id}
                        style={{ cursor: execId ? "pointer" : "default", transition: "background 100ms" }}
                        onClick={() => execId && setSelectedExecutionId(execId)}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--e-bg-elevated)"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                      >
                        <td style={{ ...tdBase, color: "var(--e-text-faint)", fontSize: 11 }}>{new Date(item.created_at).toLocaleString()}</td>
                        <td style={{ ...tdBase, fontWeight: 500, color: "var(--e-text-primary)" }}>{item.username}</td>
                        <td style={tdBase}>
                          <span style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 100, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                            {item.action}
                          </span>
                        </td>
                        <td style={{ ...tdBase, fontFamily: "monospace", fontSize: 11 }}>{item.ip_address}</td>
                      <td style={{ ...tdBase, maxWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <pre style={{
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            background: "var(--e-bg-elevated)", padding: "2px 6px", borderRadius: 4,
                            border: "1px solid var(--e-border)", fontSize: 10, color: "var(--e-text-muted)", margin: 0,
                            flex: 1
                          }}>{JSON.stringify(item.details)}</pre>
                          {item.details && (
                            <button 
                              onClick={() => setSelectedAuditDetails(JSON.stringify(item.details, null, 2))}
                              className="e-btn" 
                              style={{ padding: 4, minWidth: 'auto', flexShrink: 0 }}
                            >
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
            {auditTotal > limit && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--e-border)" }}>
                <p style={{ fontSize: 11, color: "var(--e-text-muted)" }}>Showing {auditPage * limit + 1}–{Math.min((auditPage + 1) * limit, auditTotal)} of {auditTotal}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)} style={{ ...inputStyle, cursor: auditPage === 0 ? "not-allowed" : "pointer", opacity: auditPage === 0 ? 0.4 : 1 }}>Previous</button>
                  <button disabled={(auditPage + 1) * limit >= auditTotal} onClick={() => setAuditPage(p => p + 1)} style={{ ...inputStyle, cursor: (auditPage + 1) * limit >= auditTotal ? "not-allowed" : "pointer", opacity: (auditPage + 1) * limit >= auditTotal ? 0.4 : 1 }}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ExecutionDetailsDrawer
        executionId={selectedExecutionId}
        onClose={() => setSelectedExecutionId(null)}
        onUpdate={fetchExecutions}
      />
      
      <Modal isOpen={!!selectedAuditDetails} onClose={() => setSelectedAuditDetails(null)} title="Audit Details">
        <div style={{ padding: 16 }}>
          <pre style={{ 
            background: "var(--e-bg-base)", padding: 16, borderRadius: 8, 
            fontSize: 12, overflowX: "auto", color: "var(--e-text-primary)",
            border: "1px solid var(--e-border)",
            whiteSpace: "pre-wrap", wordBreak: "break-all"
          }}>
            {selectedAuditDetails}
          </pre>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => setSelectedAuditDetails(null)} className="e-btn e-btn-primary">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
