import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";

export default function AdminProjectsPage() {
  const { confirm } = useConfirm();
  const { isModerator } = useAdminContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(page * limit), limit: String(limit) });
      if (search) params.set("search", search);
      const resp = await fetchApi(`/admin/projects?${params}`);
      if (resp?.success) {
        setProjects(resp.data.items || []);
        setTotal(resp.data.total || 0);
      }
    } catch (e: any) { toast.error(e.message || "Failed to load projects"); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Delete Project",
      description: `Delete project "${name}"?`,
      confirmText: "Delete",
      variant: "destructive"
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/admin/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
      fetchProjects();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total projects</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input type="text" placeholder="Search projects..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
        />
        <button onClick={fetchProjects} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">Refresh</button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                {["Project", "Owner", "Language", "Files", "Executions", "Created", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-white/8 rounded" /></td>)}
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600">No projects found.</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400">{p.owner_username}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{p.language || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.file_count}</td>
                  <td className="px-4 py-3 text-gray-400">{p.executions}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {!isModerator && (
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
