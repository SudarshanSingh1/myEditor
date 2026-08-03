import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { useAdminContext } from "../../components/auth/AdminAuthGuard";
import { Dropdown, DropdownItem, DropdownSeparator } from "../../components/ui/Dropdown";
import { MoreHorizontal, Users, Search, RefreshCw } from "lucide-react";
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { IdentitySessionsTab } from "./IdentitySessionsTab";
import { PageHeader } from "../../components/enterprise/PageHeader";


interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
  projects_count: number;
  is_deleted: boolean;
}

const ROLES = ["USER", "MODERATOR", "ADMIN", "OWNER"];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"];

const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    OWNER: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    ADMIN: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    MODERATOR: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    USER: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30",
  };
  return map[role] || "bg-gray-500/20 text-gray-600 dark:text-gray-400";
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-500/20 text-emerald-400",
    INACTIVE: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
    SUSPENDED: "bg-amber-500/20 text-amber-400",
    BANNED: "bg-red-500/20 text-red-400",
  };
  return map[status] || "bg-gray-500/20 text-gray-600 dark:text-gray-400";
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

  const availableRoles = isSuperAdmin ? ["USER", "MODERATOR", "ADMIN", "OWNER"] : ["USER", "MODERATOR", "ADMIN"];
  const permissionPreviews: Record<string, string[]> = {
    USER: ["Basic system access", "Personal projects", "Standard features"],
    MODERATOR: ["View users", "View projects", "Manage feedback", "View errors"],
    ADMIN: ["All moderator perms", "Edit users", "Delete projects", "System settings", "View analytics"],
    OWNER: ["Full system access", "Role management", "Audit logs", "Delete admins"],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111118] border border-white/12 rounded-2xl shadow-2xl p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Admin User</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new admin or moderator account.</p>
        </div>

        <div className="space-y-4">
          {(["username", "email"] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">{field}</label>
              <input
                type={field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8"
                placeholder={field === "email" ? "admin@example.com" : "username"}
              />
              {errors[field] && <p className="text-xs text-red-400 mt-1">{errors[field]}</p>}
            </div>
          ))}

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input 
                type="checkbox"
                checked={form.send_email}
                onChange={e => setForm(f => ({ ...f, send_email: e.target.checked }))}
                className="w-4 h-4 rounded border-white/20 bg-black/5 dark:bg-white/5 text-violet-500 focus:ring-violet-500/50"
              />
              Send credentials by email
            </label>
          </div>

          <div className="relative z-20">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-[#111118] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50 appearance-none"
            >
              {availableRoles.map(r => <option key={r} value={r} className="bg-[#111118] text-gray-900 dark:text-white">{r.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Permissions Preview */}
          <div className="bg-black/5 dark:bg-white/3 rounded-lg p-3 border border-black/10 dark:border-white/8">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Permissions Preview</p>
            <ul className="space-y-1">
              {(permissionPreviews[form.role] || []).map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm text-gray-900 dark:text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Send Email to {user.username}</h2>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50"
              placeholder="Important Update"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full h-32 resize-none bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50"
              placeholder="Write your message here..."
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:bg-white/5 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !subject.trim() || !message.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-sm text-gray-900 dark:text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { isSuperAdmin, isAdmin, isModerator } = useAdminContext();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [emailTarget, setEmailTarget] = useState<UserItem | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "identity">("users");
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

  const handleAction = async (userId: string, action: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      toast.success(`Action '${action}' successful`);
      await fetchUsers();  // await so list reloads AFTER backend commits
    } catch (e: any) {
      toast.error(e.message || `Failed to perform ${action}`);
    }
  };

  const handleBulkAction = async (action: string) => {
    const confirmed = await confirm({
      title: "Bulk Action",
      description: `Perform '${action}' on ${selectedUsers.length} selected users?`,
      confirmText: "Proceed",
      variant: action === "restore" || action === "unsuspend" ? "default" : "destructive"
    });
    if (!confirmed) return;
    try {
      const resp = await fetchApi("/admin/users/bulk-actions", {
        method: "POST",
        body: JSON.stringify({ user_ids: selectedUsers, action })
      });
      if (resp?.success) {
        toast.success(`Bulk action '${action}' completed.`);
        setSelectedUsers([]);
        fetchUsers();
      }
    } catch (e: any) {
      toast.error(e.message || "Bulk action failed");
    }
  };


  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
      toast.success("Role updated");
      await fetchUsers();  // await so list reloads AFTER backend commits
    } catch (e: any) { toast.error(e.message || "Failed to update role"); }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await fetchApi(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      toast.success("Status updated");
      await fetchUsers();  // await so list reloads AFTER backend commits
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
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      {showCreate && <CreateAdminModal onClose={() => setShowCreate(false)} onSuccess={fetchUsers} />}
      {emailTarget && <SendEmailModal user={emailTarget} onClose={() => setEmailTarget(null)} />}
      <UserDetailsDrawer userId={detailsTarget} onClose={() => setDetailsTarget(null)} onUpdate={fetchUsers} />

      <PageHeader
        title="Identity & Users"
        subtitle={`${total.toLocaleString()} total accounts`}
        icon={Users}
        actions={
          !isModerator && activeTab === "users" ? (
            <button onClick={() => setShowCreate(true)} className="e-btn e-btn-primary">
              + Create Admin
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--e-border)", background: "var(--e-bg-surface)", padding: "0 24px" }}>
        {[{ key: "users", label: "User Management" }, { key: "identity", label: "Identity & Sessions" }].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              padding: "12px 16px",
              fontSize: 13, fontWeight: 600,
              color: activeTab === t.key ? "var(--e-text-primary)" : "var(--e-text-muted)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: activeTab === t.key ? "2px solid var(--e-accent)" : "2px solid transparent",
              transition: "all 150ms",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
      {activeTab === "identity" ? (
        <IdentitySessionsTab />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>


      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div className="e-search" style={{ flex: 1, minWidth: 220 }}>
          <Search size={13} color="var(--e-text-faint)" />
          <input
            type="text"
            placeholder="Search username or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
          style={{
            background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
            borderRadius: "var(--e-radius-md)", padding: "7px 12px",
            fontSize: 13, color: "var(--e-text-secondary)", outline: "none",
            minWidth: 130, cursor: "pointer",
          }}
        >
          <option value="" style={{ background: "#0d0e1a" }}>All Roles</option>
          {ROLES.map(r => <option key={r} value={r} style={{ background: "#0d0e1a" }}>{r.replace("_", " ")}</option>)}
        </select>
        <button onClick={async () => { await fetchUsers(); toast.success("Users refreshed"); }} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && !isModerator && (
        <div style={{
          background: "var(--e-bg-active)", border: "1px solid var(--e-border-accent)",
          borderRadius: "var(--e-radius-md)", padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--e-accent-light)" }}>
            {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => handleBulkAction("suspend")}      className="e-btn e-btn-sm" style={{ background: "var(--e-amber-bg)", color: "var(--e-amber)", border: "1px solid var(--e-amber-border)" }}>Suspend</button>
            <button onClick={() => handleBulkAction("unsuspend")}    className="e-btn e-btn-sm" style={{ background: "var(--e-green-bg)",  color: "var(--e-green)",  border: "1px solid var(--e-green-border)" }}>Unsuspend</button>
            <button onClick={() => handleBulkAction("force_logout")} className="e-btn e-btn-secondary e-btn-sm">Force Logout</button>
            <button onClick={() => handleBulkAction("reset_mfa")}    className="e-btn e-btn-secondary e-btn-sm">Reset MFA</button>
            <button onClick={() => setSelectedUsers([])}             className="e-btn e-btn-ghost e-btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="e-table-wrapper">
        <div style={{ overflowX: "auto" }} className="pb-32">
          <table className="e-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    style={{ width: 14, height: 14, accentColor: "var(--e-accent)", cursor: "pointer" }}
                    checked={users.length > 0 && selectedUsers.length === users.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUsers(users.map(u => u.id));
                      else setSelectedUsers([]);
                    }}
                  />
                </th>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Projects</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td><div className="e-skeleton" style={{ height: 14, width: 14 }} /></td>
                    <td><div className="e-skeleton" style={{ height: 14, width: 130 }} /></td>
                    <td><div className="e-skeleton" style={{ height: 20, width: 70, borderRadius: 100 }} /></td>
                    <td><div className="e-skeleton" style={{ height: 20, width: 60, borderRadius: 100 }} /></td>
                    <td><div className="e-skeleton" style={{ height: 14, width: 30 }} /></td>
                    <td><div className="e-skeleton" style={{ height: 14, width: 80 }} /></td>
                    <td><div className="e-skeleton" style={{ height: 24, width: 90, marginLeft: "auto" }} /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-600">No users found.</td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id}>
                  <td>
                    <input
                      type="checkbox"
                      style={{ width: 14, height: 14, accentColor: "var(--e-accent)", cursor: "pointer" }}
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUsers(prev => [...prev, user.id]);
                        else setSelectedUsers(prev => prev.filter(id => id !== user.id));
                      }}
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #a855f7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <p style={{ fontWeight: 600, color: "var(--e-text-primary)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</p>
                          {user.is_deleted && (
                            <span className="e-chip error" style={{ fontSize: 9 }}>Deleted</span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--e-text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin || (isAdmin && user.role !== "OWNER" && user.role !== "ADMIN") ? (
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border font-medium ${roleBadge(user.role)} bg-transparent focus:outline-none cursor-pointer`}
                      >
                        {ROLES.filter(r => {
                          if (isSuperAdmin) return true;
                          if (isAdmin) return r === "USER" || r === "MODERATOR";
                          return false;
                        }).map(r => (
                          <option key={r} value={r} style={{ color: "#1e293b", background: "#fff" }}>{r.replace("_", " ")}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${roleBadge(user.role)}`}>
                        {user.role.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin || (isAdmin && user.role !== "OWNER") ? (
                      <select
                        value={user.status}
                        onChange={e => handleStatusChange(user.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(user.status)} bg-transparent border-0 focus:outline-none cursor-pointer`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s} style={{ color: "#1e293b", background: "#fff" }}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge(user.status)}`}>
                        {user.status}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--e-text-secondary)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{user.projects_count}</td>
                  <td style={{ color: "var(--e-text-faint)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: "right" }}>
                    {!isModerator && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          onClick={() => setDetailsTarget(user.id)}
                          className="e-btn e-btn-ghost e-btn-sm"
                          style={{ color: "var(--e-accent-light)" }}
                        >
                          Details
                        </button>
                        <Dropdown
                          align="right"
                          trigger={<button className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-white rounded hover:bg-black/10 dark:bg-white/10 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>}
                        >
                          <DropdownItem onClick={() => setDetailsTarget(user.id)}>
                            View User Details
                          </DropdownItem>
                          <DropdownSeparator />
                          <DropdownItem onClick={() => setEmailTarget(user)}>
                            Send Custom Email
                          </DropdownItem>
                          <DropdownItem onClick={() => handleResendCredentials(user.id, user.username)}>
                            Reset Password & Email
                          </DropdownItem>
                          <DropdownItem onClick={() => handleAction(user.id, "force_logout")}>
                            Force Logout
                          </DropdownItem>
                          <DropdownItem onClick={() => handleAction(user.id, "reset_mfa")}>
                            Reset MFA
                          </DropdownItem>
                          {(user.role !== "OWNER" || isSuperAdmin) && (
                            <>
                              <DropdownSeparator />
                              {user.status !== "BANNED" ? (
                                <DropdownItem onClick={() => handleAction(user.id, "ban")} className="text-red-400 hover:text-red-400">
                                  Ban User
                                </DropdownItem>
                              ) : (
                                // Backend action for reversing a ban is "unsuspend" (sets status back to ACTIVE)
                                <DropdownItem onClick={() => handleAction(user.id, "unsuspend")} className="text-emerald-400 hover:text-emerald-400">
                                  Unban User
                                </DropdownItem>
                              )}
                              <DropdownItem onClick={() => handleDelete(user.id, user.username)} className="text-red-400 hover:text-red-400">
                                Delete User
                              </DropdownItem>
                            </>
                          )}
                        </Dropdown>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--e-border)", fontSize: 12, color: "var(--e-text-muted)" }}>
            <span>Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total.toLocaleString()}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="e-btn e-btn-secondary e-btn-sm"
                style={{ opacity: page === 0 ? 0.4 : 1 }}
              >
                ← Prev
              </button>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(p => p + 1)}
                className="e-btn e-btn-secondary e-btn-sm"
                style={{ opacity: (page + 1) * limit >= total ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      )}
      </div>
    </div>
  );
}
