import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { fetchApi } from "../../lib/api";
import { Badge } from "../ui/Badge";
import { DataTable, Column } from "../ui/DataTable";
import { UserDrawer } from "./UserDrawer";
import { Filter, UserPlus } from "lucide-react";

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
  
  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [message, setMessage] = useState({ text: "", type: "" });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [page, limit, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      
      const response = await fetchApi(`/admin/users?${params.toString()}`);
      if (response.success) {
        setUsers(response.data.items);
        setTotal(response.data.total);
      } else {
        setMessage({ text: response.error || "Failed to load users", type: "error" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to load users.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchUsers();
  };

  const columns: Column<User>[] = [
    {
      key: "username",
      header: "User",
      render: (u) => (
        <div>
          <div className="font-medium text-foreground">{u.username}</div>
          <div className="text-xs text-muted-foreground">{u.email}</div>
        </div>
      )
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Badge variant="outline" className="text-xs">
          {u.role}
        </Badge>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge variant={
          u.status === 'ACTIVE' ? 'success' : 
          u.status === 'BANNED' ? 'destructive' : 
          'secondary'
        } className="text-xs">
          {u.status}
        </Badge>
      )
    },
    {
      key: "created_at",
      header: "Joined",
      render: (u) => <span className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</span>
    }
  ];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users, roles, and account statuses. ({total} total)</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2">
            <UserPlus className="w-4 h-4" /> Add User
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {message.text && (
            <div className={`p-3 text-sm rounded-md ${message.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
              {message.text}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <Input 
                placeholder="Search by username or email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" disabled={isLoading}>Search</Button>
            </form>
            
            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select 
                value={roleFilter} 
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-transparent border rounded-md text-sm p-2"
              >
                <option value="">All Roles</option>
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Super Admin</option>
              </select>
              
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-transparent border rounded-md text-sm p-2"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>
          </div>

          <div className="border rounded-md relative min-h-[300px]">
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <DataTable 
              columns={columns} 
              data={users} 
              keyExtractor={(u) => u.id} 
              onRowClick={(u) => setSelectedUserId(u.id)}
              emptyMessage="No users found."
            />
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>

      <UserDrawer 
        isOpen={!!selectedUserId} 
        onClose={() => setSelectedUserId(null)} 
        userId={selectedUserId} 
        onUserUpdated={fetchUsers}
      />
    </>
  );
}
