import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { useConfirm } from "../../components/ui/ConfirmProvider";

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    SUPER_ADMIN: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    ADMIN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    MODERATOR: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    USER: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  };
  return map[role] || "bg-gray-500/20 text-gray-400";
};

export default function AdminRolesPage() {
  const { isSuperAdmin } = useAdminContext();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 30;

  if (!isSuperAdmin) return <Navigate to="/403" replace />;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(page * limit), limit: String(limit) });
      if (search) params.set("search", search);
      const resp = await fetchApi(`/admin/users?${params}`);
      if (resp?.success) {
        setUsers(resp.data.items || []);
        setTotal(resp.data.total || 0);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
      toast.success("Role updated");
      fetchUsers();
    } catch (e: any) { toast.error(e.message || "Failed to update role"); }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      toast.success("Status updated");
      fetchUsers();
    } catch (e: any) { toast.error(e.message || "Failed to update status"); }
  };

  const handleDelete = async (userId: string, username: string, role: string) => {
    if (role === "SUPER_ADMIN") { toast.error("Cannot delete a SUPER_ADMIN"); return; }
    const confirmed = await confirm({
      title: "Delete User",
      description: `Delete "${username}"? This is permanent.`,
      confirmText: "Delete",
      variant: "destructive"
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/admin/users/${userId}`, { method: "DELETE" });
      toast.success("User deleted");
      fetchUsers();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const exportCSV = () => {
    const headers = ["Username", "Email", "Role", "Status", "Projects", "Joined"];
    const rows = users.map(u => [u.username, u.email, u.role, u.status, u.projects_count, new Date(u.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "users-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Role Management</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">SUPER ADMIN</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage all user roles and permissions. {total} total users.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-white/12 text-sm text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 max-w-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
        />
        <button onClick={fetchUsers} className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg border border-white/10">
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                {["User", "Role", "Status", "Projects", "Joined", "Last Login", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-full bg-white/8 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-600">No users found.</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{user.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "SUPER_ADMIN" ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge(user.role)}`}>SUPER ADMIN</span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${roleBadge(user.role)} bg-transparent border-0 focus:outline-none cursor-pointer`}
                      >
                        {["USER", "MODERATOR", "ADMIN"].map(r => (
                          <option key={r} value={r} className="bg-[#111118] text-white">{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.status}
                      onChange={e => handleStatusChange(user.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-full bg-transparent border-0 focus:outline-none cursor-pointer text-gray-300"
                    >
                      {["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"].map(s => (
                        <option key={s} value={s} className="bg-[#111118] text-white">{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.projects_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3">
                    {user.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => handleDelete(user.id, user.username, user.role)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-xs text-gray-500">Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Previous</button>
              <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
