import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { fetchApi } from "../../lib/api";
import { useConfirm } from "../ui/ConfirmProvider";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi(`/admin/users?search=${encodeURIComponent(search)}`);
      if (response.success) {
        setUsers(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to load users.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetchApi(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole })
      });
      if (response.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setMessage({ text: "Role updated successfully", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to update role", type: "error" });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetchApi(`/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      if (response.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        setMessage({ text: "Status updated successfully", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to update status", type: "error" });
    }
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await confirm({
      title: "Delete User",
      description: "Are you sure you want to delete this user? This cannot be undone.",
      confirmText: "Delete",
      variant: "destructive"
    });
    if (!confirmed) return;
    try {
      const response = await fetchApi(`/admin/users/${userId}`, {
        method: "DELETE"
      });
      if (response.success) {
        setUsers(users.filter(u => u.id !== userId));
        setTotal(total - 1);
        setMessage({ text: "User deleted successfully", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to delete user", type: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage users, roles, and account statuses. ({total} total)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message.text && (
          <div className={`p-3 text-sm rounded-md ${message.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
            {message.text}
          </div>
        )}
        
        <div className="flex gap-2">
          <Input 
            placeholder="Search by username or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            className="max-w-sm"
          />
          <Button onClick={fetchUsers} disabled={isLoading}>Search</Button>
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{user.username}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="bg-transparent border rounded text-xs p-1"
                    >
                      <option value="USER">User</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={user.status} 
                      onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      className="bg-transparent border rounded text-xs p-1"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="BANNED">Banned</option>
                      <option value="PENDING_VERIFICATION">Pending</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
