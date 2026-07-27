import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { GitBranch, RefreshCw, Unplug, CheckCircle, XCircle } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { MetricCard } from "../../components/enterprise/MetricCard";
import { Dropdown, DropdownItem } from "../../components/ui/Dropdown";
import { MoreHorizontal } from "lucide-react";

export default function AdminGithubPage() {
  const { isSuperAdmin } = useAdminContext();
  const [dashboard, setDashboard] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dashResp = await fetchApi("/admin/github/dashboard");
      if (dashResp?.success) setDashboard(dashResp.data);

      const repoResp = await fetchApi("/admin/github/repositories");
      if (repoResp?.success) setRepos(repoResp.data.items || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load GitHub data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async (repoId: string) => {
    setSyncing(prev => ({ ...prev, [repoId]: true }));
    try {
      await fetchApi(`/admin/github/repositories/${repoId}/sync`, { method: "POST" });
      toast.success("Repository sync initiated");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to sync repository");
    } finally {
      setSyncing(prev => ({ ...prev, [repoId]: false }));
    }
  };

  const handleDisconnect = async (repoId: string) => {
    try {
      await fetchApi(`/admin/github/repositories/${repoId}/disconnect`, { method: "POST" });
      toast.success("Repository disconnected");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to disconnect repository");
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="GitHub Integration"
        subtitle="Manage global GitHub OAuth, repositories, and synchronization"
        icon={GitBranch}
        actions={
          <button onClick={async () => { await fetchData(); toast.success("GitHub metrics refreshed"); }} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      <div className="e-grid-4" style={{ gap: 12 }}>
        <MetricCard label="Connected Accounts"   value={loading ? "—" : (dashboard?.connected_accounts || 0)}   icon={GitBranch}    iconColor="var(--e-blue)"   iconBg="var(--e-blue-bg)" />
        <MetricCard label="Synced Repos"         value={loading ? "—" : (dashboard?.connected_repositories || 0)} icon={GitBranch}    iconColor="var(--e-purple)" iconBg="var(--e-purple-bg)" />
        <MetricCard label="Sync Success Rate"     value={loading ? "—" : `${dashboard?.sync_success_rate || 0}%`}  icon={CheckCircle}  iconColor="var(--e-green)"  iconBg="var(--e-green-bg)" trend="up" />
        <MetricCard label="OAuth Health"          value={loading ? "—" : (dashboard?.oauth_health || "Unknown")}   icon={GitBranch}    iconColor="var(--e-amber)"  iconBg="var(--e-amber-bg)" />
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/8 overflow-hidden bg-black/5 dark:bg-white/3">
        <div className="p-4 border-b border-black/10 dark:border-white/8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Connected Repositories</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/3 border-b border-black/10 dark:border-white/8">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Repository</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Sync</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading repositories...</td></tr>
              ) : repos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No repositories found.</td></tr>
              ) : repos.map(repo => (
                <tr key={repo.id} className="hover:bg-black/5 dark:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    {repo.repository}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{repo.owner}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{repo.branch}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(repo.last_sync).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {repo.sync_status === "Success" ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-3 h-3" /> Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
                        <XCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Dropdown
                      align="right"
                      trigger={<button className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-white rounded hover:bg-black/10 dark:bg-white/10 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>}
                    >
                      <DropdownItem onClick={() => handleSync(repo.id)} disabled={syncing[repo.id]}>
                        <RefreshCw className="w-4 h-4 mr-2" /> {syncing[repo.id] ? "Syncing..." : "Force Sync"}
                      </DropdownItem>
                      <DropdownItem onClick={() => handleDisconnect(repo.id)} className="text-red-400 hover:text-red-400">
                        <Unplug className="w-4 h-4 mr-2" /> Disconnect
                      </DropdownItem>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
