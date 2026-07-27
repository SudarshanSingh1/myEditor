import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldX, Key, Activity, Network } from "lucide-react";

export function SecurityDashboardTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi("/admin/security/dashboard");
      if (resp?.success) setData(resp.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load security dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { label: "Security Events", value: data.security_events, icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Blocked IPs", value: data.blocked_ips, icon: ShieldX, color: "text-red-400", bg: "bg-red-500/10" },
        { label: "Suspicious Logins", value: data.suspicious_logins, icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10" },
        { label: "Permission Changes", value: data.permission_changes, icon: Key, color: "text-violet-400", bg: "bg-violet-500/10" },
        { label: "Failed API Requests", value: data.failed_api_requests, icon: Activity, color: "text-rose-400", bg: "bg-rose-500/10" },
        { label: "JWT Activity", value: data.jwt_activity, icon: Network, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      ].map((stat, i) => (
        <div key={i} className="p-4 rounded-xl border border-black/10 dark:border-white/8 bg-black/5 dark:bg-white/3 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${stat.bg}`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{stat.value.toLocaleString()}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
