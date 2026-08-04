import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Bug, RefreshCw, Trash2, X } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { useConfirm } from "../../components/ui/ConfirmProvider";

export default function AdminErrorsPage() {
  const { confirm } = useConfirm();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 20;

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi(`/admin/errors?skip=${page * limit}&limit=${limit}`);
      if (resp?.success) { setItems(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load errors"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle single deletion
  const handleDelete = async (id: string) => {
    if (await confirm("Are you sure you want to delete this error log?")) {
      try {
        const res = await fetchApi(`/admin/errors/${id}`, { method: "DELETE" });
        if (res?.success) {
          toast.success("Error deleted successfully");
          setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          fetchData();
        } else {
          toast.error(res?.error || "Failed to delete error");
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to delete error");
      }
    }
  };

  // Bulk Selection Handlers
  const visibleIds = items.map(item => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelection = (id: string, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastSelectedId) {
        const currentIndex = visibleIds.indexOf(id);
        const lastIndex = visibleIds.indexOf(lastSelectedId);
        if (currentIndex !== -1 && lastIndex !== -1) {
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          for (let i = start; i <= end; i++) {
            next.add(visibleIds[i]);
          }
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        toggleSelectAllVisible();
      }
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIds, allVisibleSelected]);

  // Handle Bulk Deletion
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmed = await confirm(`Delete ${count} error${count > 1 ? 's' : ''}? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDeletingBulk(true);
    
    // Optimistic UI
    const previousItems = [...items];
    const previousTotal = total;
    setItems(items.filter(item => !selectedIds.has(item.id)));
    setTotal(Math.max(0, total - count));
    const idsToDelete = Array.from(selectedIds);
    setSelectedIds(new Set()); // Clear selection immediately

    try {
      const res = await fetchApi(`/admin/errors/bulk`, {
        method: "DELETE",
        body: JSON.stringify({ ids: idsToDelete })
      });

      if (res?.success) {
        toast.success(`Successfully deleted ${res.data.deleted_count} errors.`);
        fetchData(); // Refresh to fill up the page if needed
      } else {
        throw new Error(res?.error || "Failed to delete errors");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete errors. Changes rolled back.");
      // Rollback
      setItems(previousItems);
      setTotal(previousTotal);
      setSelectedIds(new Set(idsToDelete)); // Restore selection
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%", position: "relative" }}>
      <PageHeader
        title="System Errors"
        subtitle={`${total.toLocaleString()} errors logged`}
        icon={Bug}
        iconColor="var(--e-red)"
        actions={
          <button onClick={async () => { await fetchData(); toast.success("Errors refreshed"); }} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      {/* Sticky Bulk Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--e-bg-active)",
          borderBottom: "1px solid var(--e-border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          backdropFilter: "blur(8px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSelectedIds(new Set())} className="e-btn e-btn-ghost e-btn-icon" title="Clear selection (Esc)">
              <X size={16} />
            </button>
            <span style={{ fontWeight: 600, color: "var(--e-text-main)" }}>
              {selectedIds.size} selected
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="e-btn" 
              style={{ background: "var(--e-red)", color: "white", opacity: isDeletingBulk ? 0.5 : 1 }}
            >
              <Trash2 size={16} style={{ marginRight: 6 }} />
              {isDeletingBulk ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Master Checkbox Header */}
        {!loading && items.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px" }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={el => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
              title="Select all on this page (Ctrl+A)"
            />
            <span style={{ fontSize: 13, color: "var(--e-text-muted)", fontWeight: 500 }}>
              Select all on page
            </span>
          </div>
        )}

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
          <div className="rounded-xl border border-black/10 dark:border-white/8 bg-black/5 dark:bg-white/3 p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No system errors logged.</p>
            <p className="text-gray-600 text-sm mt-1">System is running cleanly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(e => (
              <div key={e.id} 
                   className={`rounded-xl border ${selectedIds.has(e.id) ? 'border-red-500 bg-red-500/10' : 'border-red-500/15 bg-red-500/3'} overflow-hidden transition-colors`}>
                <div className="w-full flex items-start p-5 text-left hover:bg-red-500/5 transition-colors gap-4">
                  <div className="mt-1" onClick={(ev) => ev.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(e.id)}
                      onChange={(ev) => {
                        const shiftKey = (ev.nativeEvent as any).shiftKey;
                        toggleSelection(e.id, shiftKey);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
                    />
                  </div>
                  <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/20 font-mono">
                        {e.error_type || "ERROR"}
                      </span>
                      {e.route && <span className="text-xs text-gray-500 font-mono">{e.route}</span>}
                    </div>
                    <p className="text-sm text-red-200 mt-1.5 line-clamp-1">{e.message || "Unknown error"}</p>
                    <p className="text-xs text-gray-600 mt-1">{new Date(e.created_at).toLocaleString()}{e.user_id && ` · User: ${e.user_id}`}</p>
                  </button>
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-600 ml-3">{expanded === e.id ? "▲" : "▼"}</span>
                    <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} disabled={isDeletingBulk} className="text-red-500 hover:text-red-400 p-1" title="Delete error">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {expanded === e.id && e.stack_trace && (
                  <div className="border-t border-red-500/10 bg-black/5 dark:bg-black/20 p-4">
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
