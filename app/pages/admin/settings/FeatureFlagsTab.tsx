import { useState, useEffect } from "react";
import { fetchApi } from "../../../lib/api";
import { toast } from "sonner";
import { ToggleLeft, Plus, Trash2, Edit2 } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Toggle } from "./SettingsFormControls";

export default function FeatureFlagsTab() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    key: "",
    description: "",
    enabled: false,
    environment: "production",
    rollout_percentage: 100
  });

  const loadFlags = async () => {
    try {
      const resp = await fetchApi("/admin/feature-flags");
      if (resp?.success) setFlags(resp.data.items);
    } catch (e: any) {
      toast.error(e.message || "Failed to load flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFlags(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/admin/feature-flags/${editingId}` : "/admin/feature-flags";
      
      const resp = await fetchApi(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      if (resp?.success) {
        toast.success(resp.message);
        setShowModal(false);
        loadFlags();
      }
    } catch (e: any) {
      toast.error(e.message || "Operation failed");
    }
  };

  const deleteFlag = async (id: string) => {
    if (!confirm("Delete this feature flag?")) return;
    try {
      const resp = await fetchApi(`/admin/feature-flags/${id}`, { method: "DELETE" });
      if (resp?.success) {
        toast.success(resp.message);
        loadFlags();
      }
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const openEdit = (flag: any) => {
    setEditingId(flag.id);
    setFormData({
      name: flag.name,
      key: flag.key,
      description: flag.description || "",
      enabled: flag.enabled,
      environment: flag.environment,
      rollout_percentage: flag.rollout_percentage
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <ToggleLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Feature Flags</h2>
            <p className="text-sm text-gray-400">Manage runtime toggles and rollout phases.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", key: "", description: "", enabled: false, environment: "production", rollout_percentage: 100 });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" /> New Flag
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-sm font-medium text-gray-400">
              <th className="p-4">Name / Key</th>
              <th className="p-4">Env</th>
              <th className="p-4">Rollout</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
            ) : flags.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center">No flags found.</td></tr>
            ) : (
              flags.map(f => (
                <tr key={f.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white">{f.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{f.key}</div>
                  </td>
                  <td className="p-4">{f.environment}</td>
                  <td className="p-4">{f.rollout_percentage}%</td>
                  <td className="p-4">
                    {f.enabled ? (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium">Enabled</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-lg text-xs font-medium">Disabled</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(f)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteFlag(f.id)} className="p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-500/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
        title={editingId ? "Edit Feature Flag" : "New Feature Flag"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-500">Save Flag</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Key (Code Reference)</label>
            <input required value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Environment</label>
              <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rollout %</label>
              <input type="number" min="0" max="100" value={formData.rollout_percentage} onChange={e => setFormData({...formData, rollout_percentage: parseInt(e.target.value)})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" />
            </div>
          </div>
          <div className="pt-2">
            <Toggle
              label="Enable Flag"
              checked={formData.enabled}
              onChange={(val) => setFormData({...formData, enabled: val as boolean})}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
