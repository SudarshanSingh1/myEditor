import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";

const priorityColor = (p: string) => ({
  HIGH: "text-red-400 bg-red-500/10 border-red-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  LOW: "text-green-400 bg-green-500/10 border-green-500/20",
}[p] || "text-gray-400 bg-gray-500/10 border-gray-500/20");

const FEEDBACK_STATUSES = ["New", "In Review", "Planned", "In Progress", "Completed", "Rejected"];

function FeedbackItemCard({ f, onUpdate }: { f: any, onUpdate: (id: string, status: string, reply: string) => void }) {
  const [status, setStatus] = useState(f.status);
  const [reply, setReply] = useState(f.admin_reply || "");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-5 hover:bg-white/5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">{f.subject || "No Subject"}</h3>
            {f.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColor(f.priority)}`}>{f.priority}</span>
            )}
            {f.rating && <span className="text-xs text-amber-400">{"★".repeat(f.rating)}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            By <span className="text-gray-400">{f.username}</span> · {f.category} · {new Date(f.created_at).toLocaleString()}
          </p>
          {f.description && <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{f.description}</p>}
          
          {(f.admin_reply || isEditing) && (
            <div className="mt-4 bg-[#111118] p-3 rounded-lg border border-white/5">
              <p className="text-xs text-gray-400 mb-1 font-semibold">Admin Reply:</p>
              {isEditing ? (
                <textarea 
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                  rows={3}
                  placeholder="Type your reply here..."
                />
              ) : (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{f.admin_reply}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value);
              if (!isEditing) onUpdate(f.id, e.target.value, reply);
            }}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:border-violet-500/50"
          >
            {FEEDBACK_STATUSES.map(s => <option key={s} value={s} className="bg-[#111118]">{s}</option>)}
          </select>
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={() => { setIsEditing(false); setReply(f.admin_reply || ""); }} className="text-xs px-2 py-1 bg-white/5 rounded text-gray-400 hover:text-white">Cancel</button>
              <button onClick={() => { setIsEditing(false); onUpdate(f.id, status, reply); }} className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 rounded hover:bg-violet-500/30">Save Reply</button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-xs text-blue-400 hover:text-blue-300 underline">Reply</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchApi(`/admin/feedback?skip=${page * limit}&limit=${limit}`);
      if (resp?.success) { setItems(resp.data.items || []); setTotal(resp.data.total || 0); }
    } catch (e: any) { toast.error(e.message || "Failed to load feedback"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string, admin_reply: string) => {
    try {
      await fetchApi(`/admin/feedback/${id}`, { method: "PATCH", body: JSON.stringify({ status, admin_reply }) });
      toast.success("Feedback updated");
      fetchData();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">{total} submissions</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">Refresh</button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-white/8 bg-white/3 p-5">
              <div className="h-4 w-48 bg-white/10 rounded mb-2" />
              <div className="h-3 w-full bg-white/8 rounded" />
            </div>
          ))}
        </div>
      ) : items.filter(f => !["Completed", "Rejected"].includes(f.status)).length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 p-12 text-center text-gray-600">No active feedback.</div>
      ) : (
        <div className="space-y-3">
          {items.filter(f => !["Completed", "Rejected"].includes(f.status)).map(f => (
            <FeedbackItemCard key={f.id} f={f} onUpdate={updateStatus} />
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Previous</button>
            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
