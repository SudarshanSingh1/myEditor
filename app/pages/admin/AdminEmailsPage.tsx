import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Mail, RefreshCw, Search, Filter, AlertCircle, CheckCircle2, Clock, Send, ShieldAlert, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  user_role: string;
  status: string;
  provider: string;
  error_message: string | null;
  retries: number;
  created_at: string;
  sent_at: string | null;
}

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadEmails = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const resp = await fetchApi(`/admin/emails?skip=${skip}&limit=${limit}&search=${search}&status=${statusFilter}`);
      if (resp?.success) {
        setEmails(resp.data.items || []);
        setTotal(resp.data.total || 0);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load emails");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      loadEmails();
    }, 300);
    return () => clearTimeout(delay);
  }, [page, search, statusFilter]);

  const handleRetry = async (id: string) => {
    try {
      const resp = await fetchApi(`/admin/emails/${id}/retry`, { method: "POST" });
      if (resp?.success) {
        toast.success("Email retry queued successfully");
        loadEmails();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to retry email");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'SENT': return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case 'FAILED': return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 font-sans max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Email History</h1>
            <p className="text-sm text-gray-400 mt-1">View outgoing platform emails and delivery statuses.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadEmails}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by email or subject..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-[#18181b] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Table container */}
      <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Provider</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sent Time</th>
                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && emails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading emails...
                  </td>
                </tr>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No emails found.
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-sm text-white">{email.recipient}</div>
                      {email.user_role && (
                        <div className="text-xs text-gray-500 mt-1">{email.user_role}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300 line-clamp-1">{email.subject}</div>
                      {email.error_message && (
                        <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> {email.error_message}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusClass(email.status)}`}>
                        {getStatusIcon(email.status)}
                        {email.status}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-400">{email.provider}</div>
                      {email.retries > 0 && (
                        <div className="text-xs text-amber-500/80 mt-1">Retried {email.retries}x</div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-400 whitespace-nowrap">
                      {email.sent_at ? format(new Date(email.sent_at), "MMM d, yyyy HH:mm") : "-"}
                    </td>
                    <td className="p-4 text-right">
                      {email.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(email.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors border border-white/5 hover:border-white/10"
                        >
                          <Send className="w-3.5 h-3.5" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {!loading && total > limit && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white disabled:opacity-50 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white disabled:opacity-50 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
