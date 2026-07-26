/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";

import { fetchApi } from "../../lib/api";

import { toast } from "sonner";

import { Flag, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";

interface Report {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { id: string; username: string } | null;
  assignee: { id: string; username: string } | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [targetType, setTargetType] = useState<string>("");

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, targetType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) q.append("status", statusFilter);
      if (targetType) q.append("target_type", targetType);
      
      const res = await fetchApi(`/admin/reports?${q}`);
      if (res?.success) {
        setReports(res.data.items);
        setTotal(res.data.total);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "assign" | "resolve" | "reject") => {
    try {
      const res = await fetchApi(`/admin/reports/${id}/${action}`, { method: "POST" });
      if (res?.success) {
        toast.success(res.message);
        fetchReports();
      }
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} report`);
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Moderation Reports"
        subtitle={`${total.toLocaleString()} reports in queue`}
        icon={Flag}
        iconColor="var(--e-amber)"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: statusFilter, set: (v: string) => { setStatusFilter(v); setPage(1); }, opts: [["","All Statuses"],["PENDING","Pending"],["IN_PROGRESS","In Progress"],["RESOLVED","Resolved"],["REJECTED","Rejected"]] },
              { val: targetType,   set: (v: string) => { setTargetType(v); setPage(1); },   opts: [["","All Types"],["USER","User"],["PROJECT","Project"]] },
            ].map((f, i) => (
              <select key={i} value={f.val} onChange={e => f.set(e.target.value)}
                style={{ background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)", borderRadius: "var(--e-radius-md)", padding: "6px 10px", fontSize: 12, color: "var(--e-text-secondary)", outline: "none", cursor: "pointer" }}
              >
                {f.opts.map(([v, l]) => <option key={v} value={v} style={{ background: "#0d0e1a" }}>{l}</option>)}
              </select>
            ))}
          </div>
        }
      />
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      <div className="rounded-xl border border-white/8 overflow-hidden bg-[#111118]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Reporter</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Reason</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-400">Assignee</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <Flag className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No reports match your filters.
                  </td>
                </tr>
              ) : reports.map(r => (
                <tr key={r.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-400 mr-2">{r.target_type}</span>
                    {r.target_id.slice(0,8)}...
                  </td>
                  <td className="px-4 py-3 text-gray-300">{r.reporter?.username || "Unknown"}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : r.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : r.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{r.assignee?.username || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "PENDING" && (
                        <button onClick={() => handleAction(r.id, "assign")} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-blue-400" title="Assign to me">
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      {(r.status === "PENDING" || r.status === "IN_PROGRESS") && (
                        <>
                          <button onClick={() => handleAction(r.id, "resolve")} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-emerald-400" title="Resolve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleAction(r.id, "reject")} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-red-400" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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