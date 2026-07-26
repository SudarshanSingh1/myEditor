import { useState } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { AlertOctagon, ShieldAlert, CheckSquare, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/enterprise/PageHeader";

export default function AdminFactoryResetPage() {
  const [scopes, setScopes] = useState<Record<string, boolean>>({
    executions: false,
    projects: false,
    users: false,
  });
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const _navigate = useNavigate();

  const toggleScope = (key: string) => setScopes(s => ({ ...s, [key]: !s[key] }));

  const executeReset = async () => {
    if (confirmText !== "I_UNDERSTAND_THIS_IS_IRREVERSIBLE") {
      toast.error("Invalid confirmation string.");
      return;
    }

    const selectedScopes = Object.keys(scopes).filter(k => scopes[k]);
    if (selectedScopes.length === 0) {
      toast.error("Select at least one scope to reset.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetchApi("/admin/infrastructure/factory-reset", {
        method: "POST",
        body: JSON.stringify({
          confirm: confirmText,
          scope: selectedScopes
        })
      });
      if (resp?.success) {
        toast.success(resp.message);
        setConfirmText("");
        setScopes({ executions: false, projects: false, users: false });
      }
    } catch (e: any) {
      toast.error(e.message || "Factory reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Factory Reset"
        subtitle="Danger Zone — Permanently delete platform data. Actions are irreversible."
        icon={AlertOctagon}
        iconColor="var(--e-red)"
      />
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Warning banner */}
      <div style={{ padding: "16px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, display: "flex", gap: 14 }}>
        <ShieldAlert size={22} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#dc2626", marginBottom: 6 }}>Read Before Proceeding</p>
          <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 6 }}>This module allows you to permanently delete data across the platform. There is no undo functionality.</p>
          <ul style={{ fontSize: 13, color: "#b91c1c", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
            <li>Your Owner account will <strong>never</strong> be deleted by this process.</li>
            <li>System Settings and Audit Logs are preserved.</li>
            <li>If you wipe Users, all users EXCEPT your account will be removed.</li>
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--e-text-primary)" }}>Select Scope</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { key: "executions", label: "Executions", desc: "Deletes all execution logs and code runs." },
            { key: "projects",   label: "Projects",   desc: "Deletes all projects, files, and workspaces." },
            { key: "users",      label: "Users",      desc: "Deletes all users except your Owner account." },
          ].map(item => (
            <div
              key={item.key}
              onClick={() => toggleScope(item.key)}
              style={{
                padding: "14px 16px", borderRadius: 12, cursor: "pointer", transition: "all 150ms",
                background: scopes[item.key] ? "#fef2f2" : "var(--e-bg-surface)",
                border: scopes[item.key] ? "2px solid #dc2626" : "1px solid var(--e-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: scopes[item.key] ? "#dc2626" : "var(--e-text-primary)" }}>{item.label}</span>
                {scopes[item.key] && <CheckSquare size={17} style={{ color: "#dc2626" }} />}
              </div>
              <p style={{ fontSize: 12, color: "var(--e-text-muted)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16, borderTop: "1px solid var(--e-border)" }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--e-text-secondary)", marginBottom: 8 }}>
            To proceed, type exactly:{" "}
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 5, userSelect: "all" }}>
              I_UNDERSTAND_THIS_IS_IRREVERSIBLE
            </span>
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: "1px solid #fca5a5", background: "#fff",
              color: "#dc2626", fontFamily: "monospace", fontSize: 14, textAlign: "center",
              outline: "none", boxSizing: "border-box",
            }}
            placeholder="Awaiting confirmation string..."
          />
        </div>
        <button
          onClick={executeReset}
          disabled={loading || confirmText !== "I_UNDERSTAND_THIS_IS_IRREVERSIBLE" || !Object.values(scopes).some(Boolean)}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: (loading || confirmText !== "I_UNDERSTAND_THIS_IS_IRREVERSIBLE" || !Object.values(scopes).some(Boolean)) ? 0.45 : 1,
            transition: "opacity 150ms, background 150ms",
          }}
        >
          {loading ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : <AlertOctagon size={18} />}
          Execute Factory Reset
        </button>
      </div>
      </div>
    </div>
  );
}

