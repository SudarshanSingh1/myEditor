import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { ExecutionDetailsDrawer } from "./ExecutionDetailsDrawer";
import { Settings, Play, Server, Clock, Activity, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce"; // Assuming this exists, if not we'll inline it or just use simple timeout in react

// Inline debounce hook to avoid missing dependency
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminExecutionsPage() {
  const [activeTab, setActiveTab] = useState<'executions' | 'audit'>('executions');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  
  // Executions State
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

  // Audit State
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
    } catch (e) {
      console.error("Failed to load dashboard stats", e);
    }
  };

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        skip: String(page * limit), 
        limit: String(limit),
        sort_by: sortBy,
        sort_desc: String(sortDesc)
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
    const interval = setInterval(fetchDashboard, 15000); // Live poll
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

  const statusColors: Record<string, string> = {
    SUCCESS: "text-emerald-400 bg-emerald-500/10",
    FAILED: "text-red-400 bg-red-500/10",
    COMPILE_ERROR: "text-red-400 bg-red-500/10",
    RUNTIME_ERROR: "text-red-400 bg-red-500/10",
    SYSTEM_ERROR: "text-red-400 bg-red-500/10",
    TIMEOUT: "text-amber-400 bg-amber-500/10",
    RUNNING: "text-blue-400 bg-blue-500/10",
    QUEUED: "text-gray-400 bg-gray-500/10",
    CANCELLED: "text-gray-400 bg-gray-500/10",
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Execution Operations Center</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor, manage, and audit code executions.</p>
        </div>
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
          <button onClick={() => setActiveTab('executions')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'executions' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:text-white'}`}>Operations</button>
          <button onClick={() => setActiveTab('audit')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${activeTab === 'audit' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:text-white'}`}>Audit Logs</button>
        </div>
      </div>

      {activeTab === 'executions' && (
        <>
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-gray-400"><Activity className="w-4 h-4 text-emerald-400"/> <span className="text-xs uppercase font-semibold">Queue Status</span></div>
              <p className="text-xl font-bold text-white">{dashboardStats?.live_queue_status || "..."}</p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-gray-400"><Server className="w-4 h-4 text-blue-400"/> <span className="text-xs uppercase font-semibold">Active Workers</span></div>
              <p className="text-xl font-bold text-white">{dashboardStats?.running_workers ?? "..."}</p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-gray-400"><Clock className="w-4 h-4 text-amber-400"/> <span className="text-xs uppercase font-semibold">Avg Runtime</span></div>
              <p className="text-xl font-bold text-white">{dashboardStats?.average_runtime_ms !== undefined ? `${dashboardStats.average_runtime_ms}ms` : "..."}</p>
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-gray-400"><Database className="w-4 h-4 text-violet-400"/> <span className="text-xs uppercase font-semibold">Queue Length</span></div>
              <p className="text-xl font-bold text-white">{dashboardStats?.queue_length ?? "..."}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
              <div><p className="text-xs text-gray-400 uppercase font-semibold">Success Rate</p><p className="text-lg font-bold text-emerald-400">{dashboardStats?.success_rate ?? "..."}%</p></div>
              <CheckCircle className="w-6 h-6 text-emerald-400/20" />
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
              <div><p className="text-xs text-gray-400 uppercase font-semibold">Failure Rate</p><p className="text-lg font-bold text-red-400">{dashboardStats?.failure_rate ?? "..."}%</p></div>
              <AlertTriangle className="w-6 h-6 text-red-400/20" />
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
              <div><p className="text-xs text-gray-400 uppercase font-semibold">Running</p><p className="text-lg font-bold text-blue-400">{dashboardStats?.running_executions ?? "..."}</p></div>
              <Play className="w-6 h-6 text-blue-400/20" />
            </div>
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
              <div><p className="text-xs text-gray-400 uppercase font-semibold">Active Containers</p><p className="text-lg font-bold text-violet-400">{dashboardStats?.active_containers ?? "..."}</p></div>
              <Server className="w-6 h-6 text-violet-400/20" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input type="text" placeholder="Search by user or project..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="w-full sm:w-auto flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
              <option value="">All Statuses</option>
              <option value="ExecutionStatus.QUEUED">Queued</option>
              <option value="ExecutionStatus.RUNNING">Running</option>
              <option value="ExecutionStatus.SUCCESS">Success</option>
              <option value="ExecutionStatus.COMPILE_ERROR">Compile Error</option>
              <option value="ExecutionStatus.RUNTIME_ERROR">Runtime Error</option>
              <option value="ExecutionStatus.TIMEOUT">Timeout</option>
              <option value="ExecutionStatus.SYSTEM_ERROR">System Error</option>
              <option value="ExecutionStatus.CANCELLED">Cancelled</option>
            </select>
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
            </select>
            <button onClick={fetchExecutions} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">Refresh</button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-white/3 border-b border-white/8">
                    {[{k: 'created_at', l: 'Timestamp'}, {k: 'user', l: 'User'}, {k: 'project', l: 'Project'}, {k: 'language', l: 'Language'}, {k: 'status', l: 'Status'}, {k: 'execution_time_ms', l: 'Runtime'}].map(h => (
                      <th key={h.k} onClick={() => handleSort(h.k)} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
                        {h.l} {sortBy === h.k && (sortDesc ? '↓' : '↑')}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-white/8 rounded" /></td>)}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600">No executions found.</td></tr>
                  ) : items.map(item => {
                    const stRaw = item.status?.replace("ExecutionStatus.", "") || "";
                    const st = stRaw.replace(".", "").toUpperCase() || "UNKNOWN";
                    return (
                      <tr key={item.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-300">{item.username}</td>
                        <td className="px-4 py-3 text-gray-300">{item.project_name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{item.language || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColors[st] || "text-gray-400 bg-gray-500/10"}`}>{stRaw}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{item.duration_ms ? `${item.duration_ms}ms` : "—"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedExecutionId(item.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors border border-white/10">
                            <Settings className="w-3.5 h-3.5" /> Details
                          </button>
                        </td>
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
        </>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <input type="text" placeholder="Search by user..." value={auditSearch}
              onChange={e => { setAuditSearch(e.target.value); setAuditPage(0); }}
              className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
            <button onClick={fetchAudit} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">Refresh</button>
          </div>
          
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-white/3 border-b border-white/8">
                    {["Timestamp", "User", "Action", "IP Address", "Details"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-white/8 rounded" /></td>)}
                      </tr>
                    ))
                  ) : auditItems.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-600">No audit logs found.</td></tr>
                  ) : auditItems.map(item => (
                    <tr key={item.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-300">{item.username}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{item.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.ip_address}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        <pre className="max-w-xs truncate overflow-hidden bg-black/20 p-1 rounded border border-white/5">{JSON.stringify(item.details)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditTotal > limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
                <p className="text-xs text-gray-500">Showing {auditPage * limit + 1}–{Math.min((auditPage + 1) * limit, auditTotal)} of {auditTotal}</p>
                <div className="flex gap-2">
                  <button disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Previous</button>
                  <button disabled={(auditPage + 1) * limit >= auditTotal} onClick={() => setAuditPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Next</button>
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
    </div>
  );
}
