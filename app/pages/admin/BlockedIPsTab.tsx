import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Dropdown, DropdownItem } from "../../components/ui/Dropdown";
import { MoreHorizontal } from "lucide-react";

export function BlockedIPsTab() {
  const [ips, setIps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlock, setShowBlock] = useState(false);
  const [form, setForm] = useState({ ip_address: "", reason: "", temporary: true });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi("/admin/security/blocked-ips");
      if (resp?.success) setIps(resp.data.items || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load blocked IPs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBlock = async () => {
    if (!form.ip_address.trim()) return toast.error("IP is required");
    try {
      const resp = await fetchApi("/admin/security/blocked-ips", {
        method: "POST",
        body: JSON.stringify(form)
      });
      if (resp?.success) {
        toast.success("IP Blocked");
        setShowBlock(false);
        setForm({ ip_address: "", reason: "", temporary: true });
        fetchData();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to block IP");
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await fetchApi(`/admin/security/blocked-ips/${id}/unblock`, { method: "POST" });
      toast.success("IP Unblocked");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to unblock IP");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <h2 className="text-lg font-bold text-white">Blocked IPs</h2>
        <button
          onClick={() => setShowBlock(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Block IP
        </button>
      </div>

      {showBlock && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Block New IP</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text" placeholder="IP Address" value={form.ip_address}
              onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              type="text" placeholder="Reason" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" checked={form.temporary} onChange={e => setForm(f => ({ ...f, temporary: e.target.checked }))} />
              Temporary (24h)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleBlock} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg">Confirm Block</button>
            <button onClick={() => setShowBlock(false)} className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/8 overflow-hidden bg-white/3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expires At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Blocked At</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : ips.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No blocked IPs</td></tr>
              ) : ips.map(ip => (
                <tr key={ip.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-white font-medium">{ip.ip_address}</td>
                  <td className="px-4 py-3 text-gray-400">{ip.reason || "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {ip.expires_at ? new Date(ip.expires_at).toLocaleString() : <span className="text-red-400">Permanent</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(ip.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Dropdown
                      align="right"
                      trigger={<button className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-white/10"><MoreHorizontal className="w-4 h-4" /></button>}
                    >
                      <DropdownItem onClick={() => handleUnblock(ip.id)} className="text-emerald-400 hover:text-emerald-400">
                        Unblock IP
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
