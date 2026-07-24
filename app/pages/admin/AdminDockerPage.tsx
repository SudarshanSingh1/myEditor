import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Container, Play, Square, RefreshCw, Trash2, Terminal } from "lucide-react";
import { Drawer } from "../../components/ui/Drawer";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { StatusChip, LiveDot } from "../../components/enterprise/MiniSparkline";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  created: string;
  state: string;
}

export default function AdminDockerPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsContainer, setLogsContainer] = useState<string | null>(null);
  const [logs, setLogs] = useState("");

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/admin/docker/containers");
      if (res?.success) setContainers(res.data.items);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch containers");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "stop" | "restart" | "remove") => {
    const endpoint = action === "remove" ? `/admin/docker/containers/${id}` : `/admin/docker/containers/${id}/${action}`;
    const method = action === "remove" ? "DELETE" : "POST";
    
    try {
      const res = await fetchApi(endpoint, { method });
      if (res?.success) {
        toast.success(res.message);
        fetchContainers();
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} container`);
    }
  };

  const viewLogs = async (id: string) => {
    setLogsContainer(id);
    setLogs("Loading logs...");
    try {
      const res = await fetchApi(`/admin/docker/containers/${id}/logs`);
      if (res?.success) setLogs(res.data.logs);
    } catch (e: any) {
      setLogs(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Docker Engine"
        subtitle="Monitor and manage active compiler container instances"
        icon={Container}
        actions={
          <button onClick={fetchContainers} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      <div style={{ padding: "20px 24px" }}>
        <div className="e-table-wrapper">
          <table className="e-table">
            <thead>
              <tr>
                <th>Container ID</th>
                <th>Name</th>
                <th>Image</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="e-skeleton" style={{ height: 14, width: j === 0 ? 80 : 120 }} /></td>
                    ))}
                  </tr>
                ))
              ) : containers.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--e-text-faint)" }}>No containers found.</td></tr>
              ) : containers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--e-text-faint)" }}>{c.id.slice(0, 12)}</td>
                  <td style={{ fontWeight: 600, color: "var(--e-text-primary)" }}>{c.name.replace("/", "")}</td>
                  <td style={{ fontSize: 11, color: "var(--e-text-muted)" }}>{c.image}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <LiveDot status={c.state === "running" ? "online" : "offline"} />
                      <span style={{ fontSize: 11, color: c.state === "running" ? "var(--e-green)" : "var(--e-red)" }}>{c.status}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      <button onClick={() => viewLogs(c.id)} className="e-btn e-btn-ghost e-btn-sm" title="Logs" style={{ padding: "5px 6px" }}>
                        <Terminal size={13} />
                      </button>
                      <button onClick={() => handleAction(c.id, "restart")} className="e-btn e-btn-ghost e-btn-sm" title="Restart" style={{ padding: "5px 6px", color: "var(--e-blue)" }}>
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => handleAction(c.id, "stop")} className="e-btn e-btn-ghost e-btn-sm" title="Stop" style={{ padding: "5px 6px", color: "var(--e-amber)" }}>
                        <Square size={13} />
                      </button>
                      <button onClick={() => handleAction(c.id, "remove")} className="e-btn e-btn-ghost e-btn-sm" title="Remove" style={{ padding: "5px 6px", color: "var(--e-red)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer isOpen={!!logsContainer} onClose={() => setLogsContainer(null)} title="Container Logs" size="lg">
        <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 16, background: "#050508", borderRadius: "var(--e-radius-lg)", border: "1px solid var(--e-border)", overflow: "hidden" }}>
          <pre style={{ fontSize: 11, fontFamily: "monospace", color: "#10b981", flex: 1, overflowY: "auto", whiteSpace: "pre-wrap" }}>{logs}</pre>
        </div>
      </Drawer>
    </div>
  );
}
