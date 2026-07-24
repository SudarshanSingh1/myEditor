import { useState, useEffect } from "react";
import { fetchApi } from "../../../lib/api";
import { toast } from "sonner";
import { Lock, Plus, Trash2, Edit2, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";

export default function SecretsTab() {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "general",
    value: ""
  });

  const loadSecrets = async () => {
    try {
      const resp = await fetchApi("/admin/secrets");
      if (resp?.success) setSecrets(resp.data.items);
    } catch (e: any) {
      toast.error(e.message || "Failed to load secrets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSecrets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/admin/secrets/${editingId}` : "/admin/secrets";
      
      const payload = { ...formData };
      if (editingId && !payload.value) {
        toast.error("Please provide a new value if you want to update it, or leave as is if you are just changing the name/category, but currently value is required.");
        // We will send **** and backend will ignore it if it's ****, but if it's empty, backend might fail validation if we made it required.
        // Actually, backend update_secret allows empty or **** to mean "no change".
        payload.value = "****";
      }

      const resp = await fetchApi(url, {
        method,
        body: JSON.stringify(payload)
      });
      
      if (resp?.success) {
        toast.success(resp.message);
        setShowModal(false);
        loadSecrets();
      }
    } catch (e: any) {
      toast.error(e.message || "Operation failed");
    }
  };

  const deleteSecret = async (id: string) => {
    if (!confirm("Delete this secret? Services relying on it may fail.")) return;
    try {
      const resp = await fetchApi(`/admin/secrets/${id}`, { method: "DELETE" });
      if (resp?.success) {
        toast.success(resp.message);
        loadSecrets();
      }
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const openEdit = (sec: any) => {
    setEditingId(sec.id);
    setFormData({
      name: sec.name,
      category: sec.category || "general",
      value: ""
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Secrets Management</h2>
            <p className="text-sm text-gray-400">Securely store encrypted credentials.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", category: "general", value: "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" /> New Secret
        </button>
      </div>
      
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5" />
        <div className="text-sm text-rose-200">
          <p className="font-semibold mb-1">Extremely Sensitive Area</p>
          <p>Values saved here are encrypted at rest using AES-256 (Fernet) and are never exposed in plaintext to the frontend again. You cannot view a secret's value after saving it.</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-sm font-medium text-gray-400">
              <th className="p-4">Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Value</th>
              <th className="p-4">Updated</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
            ) : secrets.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center">No secrets found.</td></tr>
            ) : (
              secrets.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-white">{s.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-white/10 text-gray-300 rounded-lg text-xs font-medium">
                      {s.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-rose-300">{s.masked_value}</td>
                  <td className="p-4">{new Date(s.updated_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteSecret(s.id)} className="p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-500/20 transition-colors">
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
        title={editingId ? "Update Secret" : "New Secret"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-rose-600 hover:bg-rose-500">{editingId ? "Update" : "Save"} Secret</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" placeholder="e.g. STRIPE_API_KEY" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white">
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="oauth">OAuth / SSO</option>
              <option value="ci_cd">CI/CD</option>
              <option value="third_party">Third Party APIs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Value {editingId && <span className="text-gray-500 font-normal">(Leave blank to keep existing)</span>}
            </label>
            <input 
              type="password" 
              required={!editingId} 
              value={formData.value} 
              onChange={e => setFormData({...formData, value: e.target.value})} 
              className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-mono" 
              placeholder={editingId ? "********" : "Secret value..."}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
