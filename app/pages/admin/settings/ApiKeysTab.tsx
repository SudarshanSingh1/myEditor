import { useState, useEffect } from "react";

import { fetchApi } from "../../../lib/api";

import { toast } from "sonner";

import { Plus, Key, Trash2 } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";

import { Button } from "../../../components/ui/Button";

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", expires_in_days: 30 });
  const [newKey, setNewKey] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      const resp = await fetchApi("/admin/api-keys");
      if (resp?.success) setKeys(resp.data.items);
    } catch (e: any) {
      toast.error(e.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const createKey = async () => {
    try {
      const resp = await fetchApi(`/admin/api-keys`, {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (resp?.success) {
        setNewKey(resp.data.raw_key);
        setShowModal(false);
        loadKeys();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create API key");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API Key? It will immediately stop working.")) return;
    try {
      const resp = await fetchApi(`/admin/api-keys/${id}/revoke`, { method: "POST" });
      if (resp?.success) {
        toast.success(resp.message);
        loadKeys();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to revoke key");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">API Keys</h2>
            <p className="text-sm text-gray-400">Manage keys for programmatic access.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", expires_in_days: 30 });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Generate Key
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-sm font-medium text-gray-400">
              <th className="p-4">Name</th>
              <th className="p-4">Prefix</th>
              <th className="p-4">Created</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center">No API Keys found.</td></tr>
            ) : (
              keys.map(k => (
                <tr key={k.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-white">{k.name}</td>
                  <td className="p-4 font-mono text-xs">{k.prefix}••••••••••••</td>
                  <td className="p-4">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    {k.revoked_at ? (
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium">Revoked</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="p-4">
                    {!k.revoked_at && (
                      <button onClick={() => handleRevoke(k.id)} className="p-1.5 text-red-400 hover:text-white rounded-lg hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New API Key"
        description="This key will allow programmatic access to the platform."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={createKey} className="bg-blue-600 hover:bg-blue-500">Create Key</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Key Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" placeholder="e.g. Production Automation" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Expires In (Days, 0 for never)</label>
            <input type="number" required min="0" value={formData.expires_in_days} onChange={e => setFormData({...formData, expires_in_days: parseInt(e.target.value)})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!newKey}
        onClose={() => setNewKey(null)}
        title="API Key Created"
        description="Please copy this key now. You will not be able to see it again."
        footer={
          <Button onClick={() => setNewKey(null)} className="w-full bg-blue-600 hover:bg-blue-500">I have copied my key</Button>
        }
      >
        <div className="p-4 bg-white/5 border border-blue-500/30 rounded-xl relative group">
          <code className="text-blue-400 break-all font-mono text-sm">{newKey}</code>
        </div>
      </Modal>
    </div>
  );
}
