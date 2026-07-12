import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { Dropdown, DropdownItem, DropdownSeparator } from "../../components/ui/Dropdown";
import { MoreHorizontal } from "lucide-react";
import { useConfirm } from "../../components/ui/ConfirmProvider";

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
  projects_count: number;
}

const ROLES = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"];

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    SUPER_ADMIN: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    ADMIN: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    MODERATOR: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    USER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return map[role] || "bg-gray-500/20 text-gray-400";
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-500/20 text-emerald-400",
    INACTIVE: "bg-gray-500/20 text-gray-400",
    SUSPENDED: "bg-amber-500/20 text-amber-400",
    BANNED: "bg-red-500/20 text-red-400",
  };
  return map[status] || "bg-gray-500/20 text-gray-400";
};

function CreateAdminModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { isSuperAdmin } = useAdminContext();
  const [form, setForm] = useState({ username: "", email: "", role: "MODERATOR", send_email: true });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.email.trim()) e.email = "Email is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const resp = await fetchApi("/admin/users/create", {
        method: "POST",
        body: JSON.stringify({ username: form.username, email: form.email, role: form.role, send_email: form.send_email }),
      });
      if (resp?.success) {
        toast.success(`User '${form.username}' created successfully!`);
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = isSuperAdmin ? ["MODERATOR", "ADMIN", "SUPER_ADMIN"] : ["MODERATOR", "ADMIN"];
  const permissionPreviews: Record<string, string[]> = {
    MODERATOR: ["View users", "View projects", "Manage feedback", "View errors"],
    ADMIN: ["All moderator perms", "Edit users", "Delete projects", "System settings", "View analytics"],
    SUPER_ADMIN: ["Full system access", "Role management", "Audit logs", "Delete admins"],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111118] border border-white/12 rounded-2xl shadow-2xl p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white">Create Admin User</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new admin or moderator account.</p>
        </div>

        <div className="space-y-4">
          {(["username", "email"] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-400 mb-1 capitalize">{field}</label>
              <input
                type={field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8"
                placeholder={field === "email" ? "admin@example.com" : "username"}
              />
              {errors[field] && <p className="text-xs text-red-400 mt-1">{errors[field]}</p>}
            </div>
          ))}

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input 
                type="checkbox"
                checked={form.send_email}
                onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50"
              />
              Send credentials by email
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              {availableRoles.map(r => <option key={r} value={r} className="bg-[#111118]">{r.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Permissions Preview */}
          <div className="bg-white/3 rounded-lg p-3 border border-white/8">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Permissions Preview</p>
            <ul className="space-y-1">
              {(permissionPreviews[form.role] || []).map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-emerald-500">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SendEmailModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetchApi(`/admin/users/${user.id}/send-email`, {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      if (resp?.success) {
        toast.success("Email queued for sending.");
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111118] border border-white/12 rounded-2xl shadow-2xl p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white">Send Email to {user.username}</h2>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
              placeholder="Important Update"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full h-32 resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
              placeholder="Write your message here..."
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !subject.trim() || !message.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAdminContext();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [emailTarget, setEmailTarget] = useState<UserItem | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ skip: String(page * limit), limit: String(limit) });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
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
  }, [search, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleResendCredentials = async (user_id: string, username: string) => {
    const confirmed = await confirm({
      title: "Resend Credentials",
      description: `Are you sure you want to regenerate and resend credentials for ${username}?`,
      confirmText: "Resend",
    });
    if (!confirmed) return;
    try {
      const resp = await fetchApi(`/admin/users/${user_id}/resend-credentials`, { method: "POST" });
      if (resp?.success) {
        toast.success(resp.message || "Credentials sent successfully.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to resend credentials");
    }
  };

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

  const handleDelete = async (userId: string, username: string) => {
    const confirmed = await confirm({
      title: "Delete User",
      description: `Delete user "${username}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive"
    });
    if (!confirmed) return;
    try {
      await fetchApi(`/admin/users/${userId}`, { method: "DELETE" });
      toast.success("User deleted");
      fetchUsers();
    } catch (e: any) { toast.error(e.message || "Failed to delete user"); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {showCreate && <CreateAdminModal onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />}
      {emailTarget && <SendEmailModal user={emailTarget} onClose={() => setEmailTarget(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total users</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Create Admin
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
        />
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-violet-500/50 min-w-[140px]"
        >
          <option value="" className="bg-[#111118]">All Roles</option>
          {ROLES.map(r => <option key={r} value={r} className="bg-[#111118]">{r.replace("_", " ")}</option>)}
        </select>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-white/8 hover:bg-white/12 text-sm text-gray-300 rounded-lg transition-colors border border-white/10"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/8">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 w-32 bg-white/8 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-white/8 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-white/8 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-8 bg-white/8 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-white/8 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-24 bg-white/8 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-600">No users found.</td>
                </tr>
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
                    {isSuperAdmin && user.role !== "SUPER_ADMIN" ? (
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border font-medium ${roleBadge(user.role)} bg-transparent focus:outline-none cursor-pointer`}
                      >
                        {ROLES.filter(r => r !== "SUPER_ADMIN").map(r => (
                          <option key={r} value={r} className="bg-[#111118] text-white">{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${roleBadge(user.role)}`}>
                        {user.role.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.status}
                      onChange={e => handleStatusChange(user.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(user.status)} bg-transparent border-0 focus:outline-none cursor-pointer`}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} className="bg-[#111118] text-white">{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.projects_count}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end">
                      <Dropdown
                        align="right"
                        trigger={<button className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-white/10 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>}
                      >
                        <DropdownItem onClick={() => setEmailTarget(user)}>
                          Send Custom Email
                        </DropdownItem>
                        <DropdownItem onClick={() => handleResendCredentials(user.id, user.username)}>
                          Send Credentials
                        </DropdownItem>
                        {(user.role !== "SUPER_ADMIN" || isSuperAdmin) && (
                          <>
                            <DropdownSeparator />
                            <DropdownItem onClick={() => handleDelete(user.id, user.username)} className="text-red-400 hover:text-red-400">
                              Delete User
                            </DropdownItem>
                          </>
                        )}
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
            <p className="text-xs text-gray-500">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
