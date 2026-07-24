import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { Drawer } from "../../components/ui/Drawer";
import { toast } from "sonner";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { Play, Copy, RefreshCw, XCircle, Download, Clock, Cpu, HardDrive, Hash, Terminal } from "lucide-react";

interface ExecutionDetailsDrawerProps {
  executionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function ExecutionDetailsDrawer({ executionId, onClose, onUpdate }: ExecutionDetailsDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!executionId) {
      setData(null);
      return;
    }
    const loadDetails = async () => {
      setLoading(true);
      try {
        const resp = await fetchApi(`/admin/executions/${executionId}/details`);
        if (resp?.success) setData(resp.data);
      } catch (e: any) {
        toast.error(e.message || "Failed to load execution details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [executionId, onClose]);

  const handleAction = async (action: string, confirmTitle: string, confirmDesc: string) => {
    const confirmed = await confirm({ title: confirmTitle, description: confirmDesc, confirmText: "Proceed", variant: action === 'kill' ? "destructive" : "default" });
    if (!confirmed) return;
    try {
      const resp = await fetchApi(`/admin/executions/${executionId}/${action}`, { method: "POST" });
      if (resp?.success) {
        toast.success(`Action '${action}' successful`);
        onUpdate();
        const detailsResp = await fetchApi(`/admin/executions/${executionId}/details`);
        if (detailsResp?.success) setData(detailsResp.data);
      }
    } catch (e: any) { toast.error(e.message || `Failed to perform ${action}`); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
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

  if (!executionId) return null;

  return (
    <Drawer isOpen={!!executionId} onClose={onClose} title="Execution Details" description={data ? `ID: ${data.id}` : "Loading..."} width="max-w-2xl">
      {loading || !data ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleAction("kill", "Kill Execution", "Are you sure you want to kill this execution?")} disabled={data.status === 'CANCELLED' || data.status === 'SUCCESS' || data.status?.includes('ERROR')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm transition-colors border border-red-500/20 disabled:opacity-50">
              <XCircle className="w-4 h-4" /> Kill
            </button>
            <button onClick={() => handleAction("retry", "Retry Execution", "Retry this execution? It will be placed at the front of the queue.")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button onClick={() => handleAction("requeue", "Requeue Execution", "Requeue this execution at the back of the queue?")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <Play className="w-4 h-4" /> Requeue
            </button>
            <button onClick={() => window.location.href = `/api/v1/admin/executions/${data.id}/logs/download`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <Download className="w-4 h-4" /> Download Logs
            </button>
            <button onClick={() => handleCopy(data.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <Copy className="w-4 h-4" /> Copy ID
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">User</span><span className="text-sm text-white font-medium">{data.user}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Project</span><span className="text-sm text-white font-medium">{data.project}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Language</span><span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">{data.language}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Status</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusColors[data.status.replace("ExecutionStatus.", "").toUpperCase()] || statusColors.QUEUED}`}>{data.status}</span>
              </div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Exit Code</span><span className="text-sm text-white font-mono">{data.exit_code ?? '—'}</span></div>
            </div>
            
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Compiler</span><span className="text-sm text-gray-300">{data.compiler}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Runtime</span><span className="text-sm text-gray-300">{data.runtime ? `${data.runtime}ms` : '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Worker Node</span><span className="text-sm text-gray-300">{data.worker_node}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Queue Pos</span><span className="text-sm text-gray-300">{data.queue_position ?? '—'}</span></div>
              <div className="flex justify-between items-center"><span className="text-sm text-gray-400">Container ID</span><span className="text-xs text-gray-500 font-mono truncate max-w-[100px]">{data.container_id}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-white/10 bg-[#111118] flex items-center gap-3">
              <Cpu className="w-5 h-5 text-violet-400" />
              <div><p className="text-xs text-gray-500 uppercase font-semibold">CPU Usage</p><p className="text-sm text-white">{data.cpu_usage}</p></div>
            </div>
            <div className="p-3 rounded-lg border border-white/10 bg-[#111118] flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-violet-400" />
              <div><p className="text-xs text-gray-500 uppercase font-semibold">Memory Usage</p><p className="text-sm text-white">{data.memory_usage}</p></div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400 text-xs"><Clock className="w-3.5 h-3.5" /> Start: {data.start_time ? new Date(data.start_time).toLocaleString() : '—'}</div>
            <div className="flex items-center gap-2 text-gray-400 text-xs"><Clock className="w-3.5 h-3.5" /> End: {data.end_time ? new Date(data.end_time).toLocaleString() : '—'}</div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Hash className="w-4 h-4 text-violet-400" /> Environment Variables</h3>
            <pre className="p-3 rounded-xl border border-white/10 bg-[#0a0a0f] text-xs text-gray-300 font-mono overflow-x-auto">
              {data.env_vars}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Terminal className="w-4 h-4 text-violet-400" /> Logs</h3>
            <pre className="p-4 rounded-xl border border-white/10 bg-[#0a0a0f] text-xs text-gray-300 font-mono overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-white/10">
              {data.logs || "No logs available."}
              {data.error_output && <><br/><br/><span className="text-red-400">--- Error Output ---</span><br/><span className="text-red-300">{data.error_output}</span></>}
            </pre>
          </div>
        </div>
      )}
    </Drawer>
  );
}
