import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { HardDriveUpload, RefreshCw, CheckCircle2, XCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { StatusChip } from "../../components/enterprise/MiniSparkline";

export default function AdminBackupsPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRestore, setShowRestore] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");

  const loadBackups = async () => {
    setLoading(true);
    try {
      const resp = await fetchApi("/admin/infrastructure/backups");
      if (resp?.success) setBackups(resp.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load backups");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadBackups(); }, []);

  const triggerBackup = async () => {
    try {
      toast.info("Triggering backup...");
      const resp = await fetchApi("/admin/infrastructure/backups", {
        method: "POST",
        body: JSON.stringify({ type: "MANUAL" })
      });
      if (resp?.success) { toast.success(resp.message); loadBackups(); }
    } catch (e: any) { toast.error(e.message || "Backup failed"); }
  };

  const executeRestore = async () => {
    if (confirmText !== "RESTORE") { toast.error("You must type RESTORE to confirm."); return; }
    try {
      const resp = await fetchApi(`/admin/infrastructure/backups/${selectedBackup.id}/restore`, { method: "POST" });
      if (resp?.success) {
        toast.success(resp.message);
        setShowRestore(false); setConfirmText(""); setSelectedBackup(null);
      }
    } catch (e: any) { toast.error(e.message || "Restore failed"); }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Backup & Restore"
        subtitle="Manage database snapshots and point-in-time restoration"
        icon={HardDriveUpload}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadBackups} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={triggerBackup} className="e-btn e-btn-primary" style={{ gap: 6 }}>
              + Trigger Manual Backup
            </button>
          </div>
        }
      />

      <div style={{ padding: "20px 24px" }}>
        <div className="e-table-wrapper">
          <table className="e-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Created At</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="e-skeleton" style={{ height: 14, width: j === 0 ? 160 : 80 }} /></td>
                    ))}
                  </tr>
                ))
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--e-text-faint)" }}>
                    No backups found.
                  </td>
                </tr>
              ) : backups.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--e-text-secondary)" }}>{b.filename}</td>
                  <td>
                    <span className="e-chip info" style={{ fontSize: 10, textTransform: "uppercase" }}>{b.type}</span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--e-text-faint)", fontVariantNumeric: "tabular-nums" }}>
                    {new Date(b.created_at).toLocaleString()}
                  </td>
                  <td>
                    <StatusChip status={
                      b.status === "COMPLETED" ? "online" :
                      b.status === "FAILED"    ? "offline" : "warning"
                    } label={b.status} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {b.status === "COMPLETED" && (
                      <button
                        onClick={() => { setSelectedBackup(b); setShowRestore(true); }}
                        className="e-btn e-btn-sm"
                        style={{ gap: 5, background: "var(--e-red-bg)", color: "var(--e-red)", border: "1px solid var(--e-red-border)" }}
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showRestore}
        onClose={() => setShowRestore(false)}
        title="Confirm Database Restore"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRestore(false)}>Cancel</Button>
            <Button onClick={executeRestore} disabled={confirmText !== "RESTORE"} className="bg-rose-600 hover:bg-rose-500 text-white">
              Execute Restore
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--e-text-secondary)" }}>
            You are about to restore backup <strong style={{ color: "var(--e-text-primary)", fontFamily: "monospace" }}>{selectedBackup?.filename}</strong>.
          </p>
          <div style={{
            padding: "12px 14px", background: "var(--e-red-bg)", border: "1px solid var(--e-red-border)",
            borderRadius: "var(--e-radius-md)", display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <AlertTriangle size={16} color="var(--e-red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--e-red)", marginBottom: 4 }}>Irreversible Action</p>
              <p style={{ fontSize: 12, color: "var(--e-text-muted)" }}>
                This will overwrite the current database. All data after this backup will be permanently lost.
              </p>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--e-text-faint)", display: "block", marginBottom: 6 }}>
              Type <strong style={{ color: "var(--e-red)" }}>RESTORE</strong> to confirm
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px",
                background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
                borderRadius: "var(--e-radius-md)", color: "var(--e-text-primary)",
                fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
              placeholder="RESTORE"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
