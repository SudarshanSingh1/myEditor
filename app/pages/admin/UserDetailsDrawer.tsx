import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { Drawer } from "../../components/ui/Drawer";
import { toast } from "sonner";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { HardDrive, GitBranch, ShieldAlert, MonitorSmartphone, Clock, Activity, LogOut, Key, Shield, UserX, UserCheck } from "lucide-react";

interface UserDetailsDrawerProps {
  userId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function UserDetailsDrawer({ userId, onClose, onUpdate }: UserDetailsDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }
    const loadDetails = async () => {
      setLoading(true);
      try {
        const resp = await fetchApi(`/admin/users/${userId}/details`);
        if (resp?.success) {
          setData(resp.data);
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load user details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [userId, onClose]);

  const handleAction = async (action: string, title: string, description: string) => {
    const confirmed = await confirm({
      title,
      description,
      confirmText: "Proceed",
      variant: action === "restore" || action === "unsuspend" ? "default" : "destructive"
    });
    if (!confirmed) return;
    
    try {
      const resp = await fetchApi(`/admin/users/${userId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      if (resp?.success) {
        toast.success(`Action '${action}' successful`);
        onUpdate();
        // Reload details
        const detailsResp = await fetchApi(`/admin/users/${userId}/details`);
        if (detailsResp?.success) setData(detailsResp.data);
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to perform ${action}`);
    }
  };

  const handleResetPassword = async () => {
    const confirmed = await confirm({
      title: "Reset Password",
      description: "Are you sure you want to regenerate and send new credentials to this user?",
      confirmText: "Reset & Send",
      variant: "destructive"
    });
    if (!confirmed) return;
    try {
      const resp = await fetchApi(`/admin/users/${userId}/resend-credentials`, { method: "POST" });
      if (resp?.success) {
        toast.success("Credentials regenerated and sent.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!userId) return null;

  return (
    <Drawer
      isOpen={!!userId}
      onClose={onClose}
      title="User Details"
      description={data?.username ? `Detailed information for ${data.username}` : "Loading..."}
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
                data.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" :
                data.status === "BANNED" ? "bg-red-500/20 text-red-400" :
                "bg-amber-500/20 text-amber-400"
              }`}>{data.status}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Role</span>
              <span className="text-sm text-white font-medium">{data.role}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Email</span>
              <span className="text-sm text-white">{data.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">User ID</span>
              <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{data.id}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {data.status === "SUSPENDED" ? (
              <button onClick={() => handleAction("unsuspend", "Unsuspend User", "Restore the user's access?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm transition-colors border border-emerald-500/20">
                <UserCheck className="w-4 h-4" /> Unsuspend
              </button>
            ) : (
              <button onClick={() => handleAction("suspend", "Suspend User", "Temporarily revoke the user's access?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm transition-colors border border-amber-500/20">
                <UserX className="w-4 h-4" /> Suspend
              </button>
            )}
            
            {data.status === "BANNED" ? (
              <button onClick={() => handleAction("unban", "Unban User", "Remove the ban for this user?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm transition-colors border border-emerald-500/20">
                <UserCheck className="w-4 h-4" /> Unban
              </button>
            ) : (
              <button onClick={() => handleAction("ban", "Ban User", "Permanently ban this user?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm transition-colors border border-red-500/20">
                <ShieldAlert className="w-4 h-4" /> Ban
              </button>
            )}
            
            <button onClick={() => handleAction("force_logout", "Force Logout", "Invalidate all active sessions for this user?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <LogOut className="w-4 h-4" /> Force Logout
            </button>
            
            <button onClick={handleResetPassword} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm transition-colors border border-white/10">
              <Key className="w-4 h-4" /> Reset Password
            </button>
            
            <button onClick={() => handleAction("reset_mfa", "Reset MFA", "Disable MFA and invalidate recovery codes?")} disabled={!data.totp_enabled} className={`flex items-center gap-2 justify-center p-2 rounded-lg text-sm transition-colors border ${data.totp_enabled ? "bg-white/5 text-gray-300 hover:bg-white/10 border-white/10" : "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed"}`}>
              <Shield className="w-4 h-4" /> Reset MFA
            </button>
            
            {data.is_deleted && (
              <button onClick={() => handleAction("restore", "Restore User", "Restore this deleted user?")} className="flex items-center gap-2 justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm transition-colors border border-emerald-500/20">
                <Activity className="w-4 h-4" /> Restore User
              </button>
            )}
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
                <GitBranch className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">GitHub</span>
              </div>
              <p className={`text-sm font-semibold ${data.github_connected ? "text-emerald-400" : "text-gray-500"}`}>
                {data.github_connected ? "Connected" : "Not Connected"}
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-gray-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Security</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
              <span className="text-gray-400">MFA Enabled</span>
              <span className={data.totp_enabled ? "text-emerald-400" : "text-gray-500"}>{data.totp_enabled ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-gray-400">Failed Logins</span>
              <span className={data.failed_login_attempts > 0 ? "text-red-400 font-bold" : "text-gray-300"}>{data.failed_login_attempts}</span>
            </div>
          </div>

          {/* Active Sessions */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-violet-400" /> Recent Sessions
            </h3>
            {data.sessions?.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No recent sessions found.</p>
            ) : (
              <div className="space-y-2">
                {data.sessions?.map((s: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-white/5 bg-[#111118] flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-300 font-medium">{s.os} • {s.browser}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{s.ip_address}</p>
                    </div>
                    <div className="text-right">
                      {s.is_active ? (
                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">{new Date(s.last_active_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" /> Recent Activity (Audit)
            </h3>
            {data.recent_audits?.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No audit logs found.</p>
            ) : (
              <div className="space-y-2">
                {data.recent_audits?.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-white/5 bg-[#111118]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-medium text-amber-400">{a.action}</span>
                      <span className="text-[10px] text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{a.ip_address}</p>
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
