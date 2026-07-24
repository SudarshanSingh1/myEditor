import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { ProjectDetailsDrawer } from "./ProjectDetailsDrawer";
import { Settings, Archive, ArchiveRestore, Trash } from "lucide-react";

export default function AdminProjectsPage() {
  const { confirm } = useConfirm();
  const { isModerator } = useAdminContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [visibility, setVisibility] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  // Selections & Drawer
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(page * limit), limit: String(limit) });
      if (search) params.set("search", search);
      if (language) params.set("language", language);
      if (visibility) params.set("visibility", visibility);
      if (status) params.set("status", status);
      
      const resp = await fetchApi(`/admin/projects?${params}`);
      if (resp?.success) {
        setProjects(resp.data.items || []);
        setTotal(resp.data.total || 0);
      }
    } catch (e: any) { toast.error(e.message || "Failed to load projects"); }
    finally { setLoading(false); }
  }, [search, language, visibility, status, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === projects.length && projects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map(p => p.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    const isDestructive = action === "archive" || action === "delete";
    const confirmed = await confirm({
      title: `Bulk ${action}`,
      description: `Are you sure you want to ${action} ${selectedIds.size} project(s)?`,
      confirmText: "Confirm",
      variant: isDestructive ? "destructive" : "default"
    });
    if (!confirmed) return;

    try {
      const resp = await fetchApi(`/admin/projects/bulk-actions`, {
        method: "POST",
        body: JSON.stringify({ project_ids: Array.from(selectedIds), action })
      });
      if (resp?.success) {
        toast.success(`Successfully performed ${action} on projects`);
        setSelectedIds(new Set());
        fetchProjects();
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} projects`);
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total projects</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search projects..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full sm:w-auto flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
        />
        <select value={language} onChange={e => { setLanguage(e.target.value); setPage(0); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
          <option value="">All Languages</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
          <option value="c">C</option>
          <option value="c++">C++</option>
          <option value="java">Java</option>
          <option value="html/css">HTML/CSS</option>
        </select>
        <select value={visibility} onChange={e => { setVisibility(e.target.value); setPage(0); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
          <option value="">All Visibilities</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
          <option value="UNLISTED">Unlisted</option>
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={fetchProjects} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">Refresh</button>
      </div>

      {selectedIds.size > 0 && !isModerator && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <span className="text-sm font-medium text-violet-300 px-2">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-violet-500/20 mx-2" />
          <button onClick={() => handleBulkAction("archive")} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/20">
            <Archive className="w-4 h-4" /> Archive
          </button>
          <button onClick={() => handleBulkAction("restore")} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20">
            <ArchiveRestore className="w-4 h-4" /> Restore
          </button>
          <button onClick={() => handleBulkAction("delete")} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20">
            <Trash className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" className="rounded border-white/20 bg-white/5 checked:bg-violet-500 focus:ring-violet-500 focus:ring-offset-gray-900" 
                    checked={projects.length > 0 && selectedIds.size === projects.length}
                    onChange={toggleAll}
                  />
                </th>
                {["Project", "Owner", "Language", "Status", "Created", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-4 bg-white/8 rounded" /></td>
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-white/8 rounded" /></td>)}
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600">No projects found.</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} className={`hover:bg-white/3 transition-colors ${selectedIds.has(p.id) ? 'bg-violet-500/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-white/20 bg-white/5 checked:bg-violet-500 focus:ring-violet-500 focus:ring-offset-gray-900"
                      checked={selectedIds.has(p.id)} onChange={() => toggleSelection(p.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {p.name}
                    {p.visibility !== 'PUBLIC' && <span className="ml-2 text-[10px] text-gray-500 uppercase border border-gray-700 px-1 rounded">{p.visibility}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.owner_username}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{p.language || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_archived ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 flex items-center gap-1 w-max"><Archive className="w-3 h-3"/> Archived</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-1 w-max">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedProjectId(p.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors border border-white/10">
                      <Settings className="w-3.5 h-3.5" /> Details
                    </button>
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

      <ProjectDetailsDrawer 
        projectId={selectedProjectId} 
        onClose={() => setSelectedProjectId(null)} 
        onUpdate={fetchProjects} 
      />
    </div>
  );
}
