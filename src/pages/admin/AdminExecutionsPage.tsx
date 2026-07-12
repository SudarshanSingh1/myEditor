import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";

export default function AdminExecutionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi(`/admin/executions?skip=${page * limit}&limit=${limit}`);
      if (resp?.success) { setItems(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load executions"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusColors: Record<string, string> = {
    SUCCESS: "text-emerald-400 bg-emerald-500/10",
    FAILED: "text-red-400 bg-red-500/10",
    TIMEOUT: "text-amber-400 bg-amber-500/10",
    RUNNING: "text-blue-400 bg-blue-500/10",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Executions</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total execution logs</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">Refresh</button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                {["User", "Language", "Status", "Duration", "Timestamp"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-white/8 rounded" /></td>)}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-600">No executions logged yet.</td></tr>
              ) : items.map(item => {
                const st = item.status?.replace("ExecutionStatus.", "").replace(".", "").toUpperCase() || "UNKNOWN";
                return (
                  <tr key={item.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-gray-300">{item.username}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{item.language || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[st] || "text-gray-400 bg-gray-500/10"}`}>{st}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{item.duration_ms ? `${item.duration_ms}ms` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-xs text-gray-500">Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Previous</button>
              <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
