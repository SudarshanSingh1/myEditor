import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { ShieldCheck, ShieldAlert, Users, Fingerprint, Activity, Clock } from "lucide-react";
import { Dropdown, DropdownItem } from "../../components/ui/Dropdown";
import { MoreHorizontal } from "lucide-react";

interface SessionItem {
  id: string;
  user: string;
  device: string;
  browser: string;
  os: string;
  ip_address: string;
  country: string;
  login_time: string;
  last_activity: string;
  status: string;
}

export function IdentitySessionsTab() {
  const { isSuperAdmin } = useAdminContext();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dashResp = await fetchApi("/admin/identity/dashboard");
      if (dashResp?.success) setDashboard(dashResp.data);

      const sessResp = await fetchApi("/admin/identity/sessions");
      if (sessResp?.success) setSessions(sessResp.data.items || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load identity data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: "revoke" | "revoke-all", id?: string) => {
    try {
      if (action === "revoke") {
        await fetchApi(`/admin/identity/sessions/${id}/revoke`, { method: "POST" });
        toast.success("Session revoked");
      } else {
        await fetchApi(`/admin/identity/sessions/revoke-all`, { method: "POST" });
        toast.success("All sessions revoked");
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: dashboard?.total_users || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Active Sessions", value: dashboard?.active_sessions || 0, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Online Users", value: dashboard?.online_users || 0, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Failed Logins", value: dashboard?.failed_logins || 0, icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "MFA Enabled", value: dashboard?.mfa_enabled || 0, icon: ShieldCheck, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "OAuth Connected", value: dashboard?.oauth_connected || 0, icon: Fingerprint, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl border border-black/10 dark:border-white/8 bg-black/5 dark:bg-white/3 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {loading ? "..." : stat.value.toLocaleString()}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions Table */}
      <div className="rounded-xl border border-black/10 dark:border-white/8 overflow-hidden bg-black/5 dark:bg-white/3">
        <div className="p-4 border-b border-black/10 dark:border-white/8 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Sessions</h2>
          {isSuperAdmin && (
            <button
              onClick={() => handleAction("revoke-all")}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Revoke All Sessions
            </button>
          )}
        </div>
        <div className="overflow-x-auto pb-32">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/3 border-b border-black/10 dark:border-white/8">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Device</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Browser/OS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP & Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Login Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No active sessions</td></tr>
              ) : sessions.map(session => (
                <tr key={session.id} className="hover:bg-black/5 dark:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{session.user}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{session.device}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    <div>{session.browser}</div>
                    <div className="text-xs text-gray-500">{session.os}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    <div>{session.ip_address}</div>
                    <div className="text-xs text-gray-500">{session.country}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <div>{new Date(session.login_time).toLocaleDateString()}</div>
                    <div>{new Date(session.login_time).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Dropdown
                      align="right"
                      trigger={<button className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-white rounded hover:bg-black/10 dark:bg-white/10 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>}
                    >
                      <DropdownItem onClick={() => handleAction("revoke", session.id)} className="text-red-400 hover:text-red-400">
                        Revoke Session
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
  );
}
