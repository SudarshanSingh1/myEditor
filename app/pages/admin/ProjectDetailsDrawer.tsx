import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { Drawer } from "../../components/ui/Drawer";
import { toast } from "sonner";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { HardDrive, Play, Clock, Code, Lock, Globe, EyeOff, FileText, Download, Copy, Archive, ArchiveRestore } from "lucide-react";

interface ProjectDetailsDrawerProps {
  projectId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function ProjectDetailsDrawer({ projectId, onClose, onUpdate }: ProjectDetailsDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!projectId) {
      setData(null);
      return;
    }
    const loadDetails = async () => {
      setLoading(true);
      try {
        const resp = await fetchApi(`/admin/projects/${projectId}/details`);
        if (resp?.success) {
          setData(resp.data);
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load project details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [projectId, onClose]);

  const handleAction = async (action: string, title: string, description: string) => {
    const confirmed = await confirm({
      title,
      description,
      confirmText: "Proceed",
      variant: action === "archive" ? "destructive" : "default"
    });
    if (!confirmed) return;
    
    try {
      const resp = await fetchApi(`/admin/projects/${projectId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      if (resp?.success) {
        toast.success(`Action '${action}' successful`);
        onUpdate();
        const detailsResp = await fetchApi(`/admin/projects/${projectId}/details`);
        if (detailsResp?.success) setData(detailsResp.data);
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to perform ${action}`);
    }
  };

  const handleDownload = () => {
    window.location.href = `/api/v1/admin/projects/${projectId}/download`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!projectId) return null;

  return (
    <Drawer
      isOpen={!!projectId}
      onClose={onClose}
      title="Project Details"
      description={data?.name ? `Detailed information for ${data.name}` : "Loading..."}
    >
      {loading || !data ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status & Basic Info */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                data.is_archived ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
              }`}>{data.is_archived ? "Archived" : "Active"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Owner</span>
              <span className="text-sm text-white font-medium">{data.owner_username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Language</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{data.language || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Visibility</span>
              <span className="text-sm text-white font-medium capitalize">{data.visibility.toLowerCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Project ID</span>
              <span className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{data.id}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {!data.is_archived ? (
              <button onClick={() => handleAction("archive", "Archive Project", "Archive this project? It will be hidden from normal views.")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm transition-colors border border-amber-500/20">
                <Archive className="w-4 h-4" /> Archive
              </button>
            ) : (
              <button onClick={() => handleAction("restore", "Restore Project", "Restore this archived project?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm transition-colors border border-emerald-500/20">
                <ArchiveRestore className="w-4 h-4" /> Restore
              </button>
            )}
            
            <button onClick={() => handleAction("clone", "Clone Project", "Create an admin copy of this project?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <Copy className="w-4 h-4" /> Clone
            </button>
            
            <button onClick={handleDownload} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10 col-span-2">
              <Download className="w-4 h-4" /> Download ZIP
            </button>
          </div>

          {/* Stats & Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Storage Used</span>
              </div>
              <p className="text-xl font-bold text-white">{formatBytes(data.storage_used_bytes)}</p>
            </div>
            
            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Total Files</span>
              </div>
              <p className="text-xl font-bold text-white">{data.files?.length || 0}</p>
            </div>
          </div>

          {/* Files List */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-violet-400" /> Files ({data.files?.length || 0})
            </h3>
            {data.files?.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No files in project.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {data.files?.map((f: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg border border-white/5 bg-[#111118] flex items-center justify-between">
                    <span className="text-xs text-gray-300 truncate font-mono">{f.name}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{formatBytes(f.size || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Executions */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-violet-400" /> Recent Executions
            </h3>
            {data.executions?.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No recent executions.</p>
            ) : (
              <div className="space-y-2">
                {data.executions?.map((e: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-white/5 bg-[#111118] flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${e.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : e.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {e.status || 'UNKNOWN'}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Duration: {e.duration_ms}ms</span>
                      <span>Exit Code: {e.exit_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
