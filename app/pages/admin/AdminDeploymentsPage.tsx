import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Rocket, Plus } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { StatusChip } from "../../components/enterprise/MiniSparkline";
import { Button } from "../../components/ui/Button";

export default function AdminDeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ version: "", build_number: "", environment: "production", release_notes: "" });

  const loadDeployments = async () => {
    try {
      const resp = await fetchApi("/admin/infrastructure/deployments");
      if (resp?.success) setDeployments(resp.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDeployments(); }, []);

  const recordDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetchApi("/admin/infrastructure/deployments", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (resp?.success) {
        toast.success(resp.message);
        setShowModal(false);
        setFormData({ version: "", build_number: "", environment: "production", release_notes: "" });
        loadDeployments();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to record deployment");
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Deployments"
        subtitle="Track release history, build metadata, and deployment status"
        icon={Rocket}
        iconColor="var(--e-blue)"
        actions={
          <button onClick={() => setShowModal(true)} className="e-btn e-btn-primary" style={{ gap: 6 }}>
            <Plus size={12} /> Record Deployment
          </button>
        }
      />
      <div style={{ padding: "20px 24px" }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-sm font-medium text-gray-400">
              <th className="p-4">Version</th>
              <th className="p-4">Build</th>
              <th className="p-4">Env</th>
              <th className="p-4">Deployed At</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
            ) : deployments.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center">No deployments found.</td></tr>
            ) : (
              deployments.map(d => (
                <tr key={d.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold text-white">{d.version}</td>
                  <td className="p-4 font-mono text-xs">{d.build_number}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-white/10 text-gray-300 rounded-md text-xs">{d.environment}</span>
                  </td>
                  <td className="p-4">{new Date(d.deployed_at).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="text-emerald-400 font-medium text-xs">{d.status}</span>
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
        title="Record New Deployment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={recordDeployment} className="bg-purple-600 hover:bg-purple-500 text-white">Record</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Version</label>
              <input required value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white" placeholder="e.g. v2.4.1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Build Number</label>
              <input required value={formData.build_number} onChange={e => setFormData({...formData, build_number: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-mono" placeholder="e.g. f83b2a" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Environment</label>
            <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white">
              <option value="production">Production</option>
              <option value="staging">Staging</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Release Notes</label>
            <textarea value={formData.release_notes} onChange={e => setFormData({...formData, release_notes: e.target.value})} className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white h-24" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
