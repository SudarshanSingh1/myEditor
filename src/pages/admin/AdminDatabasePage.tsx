import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Database, Users, FolderOpen, FileText, Zap, MessageSquare, Bug, ClipboardList, RefreshCw, HardDrive } from "lucide-react";

export default function AdminDatabasePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi("/admin/database");
      if (resp?.success) setData(resp.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load database info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  const tableIcons: Record<string, any> = {
    users: Users,
    projects: FolderOpen,
    files: FileText,
    execution_logs: Zap,
    feedback: MessageSquare,
    system_errors: Bug,
    audit_logs: ClipboardList,
  };

  const getTableColor = (tableName: string) => {
    switch (tableName) {
      case "users": return "from-violet-500/20 text-violet-400";
      case "projects": return "from-amber-500/20 text-amber-400";
      case "execution_logs": return "from-pink-500/20 text-pink-400";
      case "system_errors": return "from-red-500/20 text-red-400";
      default: return "from-blue-500/20 text-blue-400";
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Database Statistics</h1>
            <p className="text-sm text-gray-400 mt-1">PostgreSQL (Neon) storage and row metrics</p>
          </div>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-sm font-medium text-white rounded-xl border border-white/10 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
          Refresh Metrics
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          <div className="animate-pulse rounded-2xl border border-white/10 bg-[#18181b] p-8 h-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-[#18181b] p-6 h-32 shadow-xl" />
            ))}
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-16 text-center text-gray-500">
          Failed to retrieve database info. <button onClick={fetchData} className="text-emerald-400 hover:text-emerald-300 transition-colors ml-2 font-medium">Retry Connection</button>
        </div>
      ) : (
        <>
          {/* DB Size Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent p-8 flex items-center justify-between group">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-emerald-400 tracking-wide uppercase">Total Allocated Storage</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-5xl font-bold text-white tracking-tight">{data.db_size || "N/A"}</p>
              </div>
            </div>
            <div className="relative z-10 p-4 rounded-full bg-emerald-500/20 text-emerald-400">
              <HardDrive className="w-10 h-10" strokeWidth={1.5} />
            </div>
            <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-emerald-500/30 transition-colors duration-500" />
          </div>

          {/* Table Counts */}
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-400" /> Table Row Distribution
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.table_counts || {}).map(([table, count]) => {
                const Icon = tableIcons[table] || Database;
                const colorTheme = getTableColor(table);
                
                return (
                  <div key={table} className="relative overflow-hidden rounded-xl border border-white/10 bg-[#18181b] shadow-xl p-6 group hover:bg-white/5 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${colorTheme} bg-opacity-20`}>
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-semibold text-gray-300 capitalize tracking-wide">{table.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-3xl font-bold text-white tabular-nums tracking-tight relative z-10">
                      {(count as number).toLocaleString()}
                    </p>
                    <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br ${colorTheme} blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#18181b] shadow-xl p-5 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Driver: <span className="text-gray-300 font-medium">PostgreSQL (Neon)</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Active Connection</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
