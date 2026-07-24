import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Bug, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";

export default function AdminErrorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi(`/admin/errors?skip=${page * limit}&limit=${limit}`);
      if (resp?.success) { setItems(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load errors"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="System Errors"
        subtitle={`${total.toLocaleString()} errors logged`}
        icon={Bug}
        iconColor="var(--e-red)"
        actions={
          <button onClick={fetchData} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-red-500/10 bg-red-500/3 p-5">
              <div className="h-4 w-48 bg-red-500/20 rounded mb-2" />
              <div className="h-3 w-full bg-red-500/10 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-400 font-medium">No system errors logged.</p>
          <p className="text-gray-600 text-sm mt-1">System is running cleanly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(e => (
            <div key={e.id} className="rounded-xl border border-red-500/15 bg-red-500/3 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                className="w-full flex items-start justify-between p-5 text-left hover:bg-red-500/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20 font-mono">
                      {e.error_type || "ERROR"}
                    </span>
                    {e.route && <span className="text-xs text-gray-500 font-mono">{e.route}</span>}
                  </div>
                  <p className="text-sm text-red-200 mt-1.5 line-clamp-1">{e.message || "Unknown error"}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(e.created_at).toLocaleString()}{e.user_id && ` · User: ${e.user_id}`}</p>
                </div>
                <span className="text-gray-600 ml-3">{expanded === e.id ? "▲" : "▼"}</span>
              </button>
              {expanded === e.id && e.stack_trace && (
                <div className="border-t border-red-500/10 bg-black/20 p-4">
                  <pre className="text-xs text-red-300/70 font-mono whitespace-pre-wrap overflow-x-auto max-h-64">{e.stack_trace}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--e-text-muted)" }}>
          <span>Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="e-btn e-btn-secondary e-btn-sm" style={{ opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="e-btn e-btn-secondary e-btn-sm" style={{ opacity: (page + 1) * limit >= total ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
