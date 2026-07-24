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
  const navigate = useNavigate();

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

      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-4">
        <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0" />
        <div className="space-y-2 text-red-200 text-sm">
          <p className="font-semibold text-lg text-red-400">Read Before Proceeding</p>
          <p>This module allows you to permanently delete data across the platform. There is no undo functionality.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your Owner account will <strong>never</strong> be deleted by this process.</li>
            <li>System Settings and Audit Logs are preserved.</li>
            <li>If you wipe Users, all users EXCEPT your account will be removed.</li>
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Select Scope</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => toggleScope("executions")}
            className={`p-4 rounded-xl border cursor-pointer transition-colors ${scopes.executions ? 'bg-red-500/20 border-red-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white">Executions</span>
              {scopes.executions && <CheckSquare className="w-5 h-5 text-red-400" />}
            </div>
            <p className="text-xs text-gray-400">Deletes all execution logs and code runs.</p>
          </div>

          <div 
            onClick={() => toggleScope("projects")}
            className={`p-4 rounded-xl border cursor-pointer transition-colors ${scopes.projects ? 'bg-red-500/20 border-red-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white">Projects</span>
              {scopes.projects && <CheckSquare className="w-5 h-5 text-red-400" />}
            </div>
            <p className="text-xs text-gray-400">Deletes all projects, files, and workspaces.</p>
          </div>

          <div 
            onClick={() => toggleScope("users")}
            className={`p-4 rounded-xl border cursor-pointer transition-colors ${scopes.users ? 'bg-red-500/20 border-red-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-white">Users</span>
              {scopes.users && <CheckSquare className="w-5 h-5 text-red-400" />}
            </div>
            <p className="text-xs text-gray-400">Deletes all users except your Owner account.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-white/5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            To proceed, type exactly: <span className="text-white font-mono select-all bg-white/10 px-2 py-1 rounded">I_UNDERSTAND_THIS_IS_IRREVERSIBLE</span>
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="w-full p-4 rounded-xl border border-red-500/30 bg-[#18181b] text-red-400 font-mono text-center focus:outline-none focus:border-red-500 transition-colors"
            placeholder="Awaiting confirmation string..."
          />
        </div>
        <button
          onClick={executeReset}
          disabled={loading || confirmText !== "I_UNDERSTAND_THIS_IS_IRREVERSIBLE" || !Object.values(scopes).some(Boolean)}
          className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <AlertOctagon className="w-5 h-5" />}
          Execute Factory Reset
        </button>
      </div>
      </div>
    </div>
  );
}
