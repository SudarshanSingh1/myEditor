import React, { useEffect, useState } from "react";
import { X, ShieldAlert, CheckCircle, Ban, Clock, UserCog, History, Key } from "lucide-react";
import { fetchApi } from "../../lib/api";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useConfirm } from "../ui/ConfirmProvider";

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onUserUpdated?: () => void;
}

interface UserDetails {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
  effective_permissions: string[];
  recent_activity: any[];
}

export function UserDrawer({ isOpen, onClose, userId, onUserUpdated }: UserDrawerProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { confirm } = useConfirm();

  useEffect(() => {
    if (isOpen && userId) {
      document.body.style.overflow = "hidden";
      fetchUserDetails(userId);
    } else {
      document.body.style.overflow = "auto";
      setUser(null);
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen, userId]);

  const fetchUserDetails = async (id: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetchApi(`/admin/users/${id}/details`);
      if (res.success) {
        setUser(res.data);
      } else {
        setError(res.error || "Failed to fetch user details");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, reasonPrompt: string) => {
    if (!userId) return;
    
    // Simple prompt for reason
    const reason = window.prompt(reasonPrompt);
    if (reason === null) return; // cancelled
    
    const confirmed = await confirm({
      title: `Confirm ${action}`,
      description: `Are you sure you want to ${action.toLowerCase()} this user?`,
      confirmText: "Yes, proceed",
      variant: action === 'BAN' || action === 'SUSPEND' ? "destructive" : "default"
    });
    
    if (!confirmed) return;

    try {
      const res = await fetchApi(`/admin/users/${userId}/actions`, {
        method: "POST",
        body: JSON.stringify({ action, reason: reason || "No reason provided" })
      });
      if (res.success) {
        fetchUserDetails(userId);
        if (onUserUpdated) onUserUpdated();
      } else {
        alert(res.error || "Action failed");
      }
    } catch (err: any) {
      alert(err.message || "Action failed");
    }
  };

  const updateRole = async (newRole: string) => {
    if (!userId) return;
    const confirmed = await confirm({
      title: "Update Role",
      description: `Change user role to ${newRole}?`,
      confirmText: "Update Role"
    });
    if (!confirmed) return;

    try {
      const res = await fetchApi(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole })
      });
      if (res.success) {
        fetchUserDetails(userId);
        if (onUserUpdated) onUserUpdated();
      } else {
        alert(res.error || "Role update failed");
      }
    } catch (err: any) {
      alert(err.message || "Role update failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative z-50 w-full max-w-md h-full bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            User Details
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-muted rounded-lg" />
              <div className="h-12 bg-muted rounded-lg" />
              <div className="h-32 bg-muted rounded-lg" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              {error}
            </div>
          ) : user ? (
            <div className="space-y-6">
              
              {/* Profile Overview */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{user.username}</h3>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={
                  user.status === 'ACTIVE' ? 'success' : 
                  user.status === 'BANNED' ? 'destructive' : 
                  'secondary'
                }>
                  {user.status}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3" /> Joined
                  </div>
                  <div className="font-medium text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <History className="w-3 h-3" /> Last Login
                  </div>
                  <div className="font-medium text-sm">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </div>
                </div>
              </div>

              {/* Role & Permissions */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Role & Permissions
                </h4>
                <div className="flex items-center gap-2">
                  <select 
                    value={user.role} 
                    onChange={(e) => updateRole(e.target.value)}
                    className="flex-1 bg-background border rounded-md text-sm p-2"
                  >
                    <option value="USER">User</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OWNER">Super Admin</option>
                  </select>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg border text-sm">
                  <div className="mb-2 font-medium flex items-center gap-2">
                    <Key className="w-3 h-3" /> Effective Permissions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.effective_permissions && user.effective_permissions.length > 0 ? (
                      user.effective_permissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-background border rounded text-xs">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">No specific permissions</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold">Account Actions</h4>
                
                {user.status !== 'ACTIVE' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => handleAction('ACTIVATE', 'Reason for activation?')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Activate Account
                  </Button>
                )}
                
                {user.status !== 'SUSPENDED' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                    onClick={() => handleAction('SUSPEND', 'Reason for suspension?')}
                  >
                    <Clock className="w-4 h-4 mr-2" /> Suspend Account
                  </Button>
                )}

                {user.status !== 'BANNED' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleAction('BAN', 'Reason for ban?')}
                  >
                    <Ban className="w-4 h-4 mr-2" /> Ban Account
                  </Button>
                )}
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
