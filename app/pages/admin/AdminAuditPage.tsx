import { useState, useEffect, useCallback } from "react";

import { fetchApi } from "../../lib/api";

import { toast } from "sonner";

import { Navigate } from "react-router-dom";

import { useAdminContext } from "../../components/auth/AdminAuthGuard";

import { SecurityDashboardTab } from "./SecurityDashboardTab";

import { BlockedIPsTab } from "./BlockedIPsTab";

import { ClipboardList, RefreshCw, Maximize2 } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";

import { EBadge } from "../../components/enterprise/PageHeader";

import { Modal } from "../../components/ui/Modal";

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

// At the top of the file, replace the old AdminAuditPage implementation with a virtualized one
export default function AdminAuditPage() {
  const { isSuperAdmin } = useAdminContext();
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "events" | "blocked" | "permissions">("dashboard");
  const limit = 500; // Increased limit for virtualization

  const [filters, setFilters] = useState({ action: "", username: "", ip_address: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // For true virtualization, we'd load many more items. Here we load 500 at a time.
      const queryParams = new URLSearchParams({
        skip: (page * limit).toString(),
        limit: limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.username && { username: filters.username }),
        ...(filters.ip_address && { ip_address: filters.ip_address })
      });
      const resp = await fetchApi(`/admin/audit?${queryParams.toString()}`);
      if (resp?.success) { setLogs(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load audit logs"); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const queryParams = new URLSearchParams({
      format: "csv",
      ...(filters.action && { action: filters.action }),
      ...(filters.username && { username: filters.username }),
      ...(filters.ip_address && { ip_address: filters.ip_address })
    });
    window.location.href = `/api/v1/admin/audit/export?${queryParams.toString()}`;
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  if (!isSuperAdmin) return <Navigate to="/403" replace />;

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
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Audit Logs"
        subtitle={`${total.toLocaleString()} events recorded`}
        icon={ClipboardList}
        badge={<EBadge color="indigo">OWNER ONLY</EBadge>}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExport} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
              Export CSV
            </button>
            <button onClick={async () => { await fetchData(); toast.success("Audit logs refreshed"); }} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        }
      />

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

      <div style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "dashboard" && <SecurityDashboardTab />}
        {activeTab === "blocked" && <BlockedIPsTab />}

        {activeTab === "events" && (
          <div className="e-table-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px", display: "flex", gap: "12px", borderBottom: "1px solid var(--e-border)", background: "var(--e-bg-surface)" }}>
              <input 
                type="text" 
                placeholder="Filter by Action..." 
                className="e-input"
                style={{ width: 180 }}
                value={filters.action}
                onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              />
              <input 
                type="text" 
                placeholder="Filter by Username..." 
                className="e-input"
                style={{ width: 180 }}
                value={filters.username}
                onChange={e => setFilters(f => ({ ...f, username: e.target.value }))}
              />
              <input 
                type="text" 
                placeholder="Filter by IP..." 
                className="e-input"
                style={{ width: 180 }}
                value={filters.ip_address}
                onChange={e => setFilters(f => ({ ...f, ip_address: e.target.value }))}
              />
            </div>
            
            <table className="e-table" style={{ minWidth: 700, margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 160 }}>Timestamp</th>
                  <th style={{ width: 120 }}>Action</th>
                  <th style={{ width: 140 }}>User</th>
                  <th style={{ width: 120 }}>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
            </table>
            
            <div 
              ref={parentRef} 
              style={{ 
                height: "calc(100vh - 280px)", 
                overflow: "auto", 
                width: "100%",
                background: "var(--e-bg-surface)"
              }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {loading ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--e-text-faint)" }}>Loading logs...</div>
                ) : logs.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--e-text-faint)", fontSize: 13 }}>No audit events found.</div>
                ) : (
                  rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const log = logs[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--e-border)',
                          padding: '0 16px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ width: 160, fontSize: 11, color: "var(--e-text-faint)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", paddingRight: 16 }}>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div style={{ width: 120, paddingRight: 16 }}>
                          <span className={`e-chip ${actionColor(log.action)}`} style={{ fontFamily: "monospace", fontSize: 10 }}>
                            {log.action}
                          </span>
                        </div>
                        <div style={{ width: 140, color: "var(--e-text-secondary)", fontSize: 13, paddingRight: 16 }}>
                          {log.username}
                        </div>
                        <div style={{ width: 120, fontFamily: "monospace", fontSize: 11, color: "var(--e-text-faint)", paddingRight: 16 }}>
                          {log.ip_address || "—"}
                        </div>
                        <div style={{ flex: 1, fontSize: 11, color: "var(--e-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

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
