import { useState, useEffect } from "react";

import { X, Bell, Check } from "lucide-react";
import { useSidebarStore } from "../../stores/useSidebarStore";

import { cn } from "../../lib/utils";

import { Button } from "../ui/Button";

import { fetchApi } from "../../lib/api";

import { toast } from "sonner";

import { useUserStore } from "../../stores/useUserStore";
import { useShallow } from 'zustand/react/shallow';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function RightPanel() {
  const { isRightPanelOpen, setRightPanelOpen } = useSidebarStore();
  const { user } = useUserStore(useShallow(state => ({ user: state.user })));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isRightPanelOpen && user) {
      fetchNotifications();
    }
  }, [isRightPanelOpen, user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/notifications?limit=50");
      if (res?.success) {
        setNotifications(res.data.items);
      }
    } catch (e: any) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: "POST" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await fetchApi(`/notifications/read-all`, { method: "POST" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All caught up!");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 mt-16 flex flex-col border-l bg-card transition-all duration-300 md:sticky md:mt-0 md:h-[calc(100vh-4rem)]",
        isRightPanelOpen ? "w-80 translate-x-0" : "w-0 translate-x-full border-l-0"
      )}
    >
      <div className={cn("flex flex-col h-full", !isRightPanelOpen && "hidden")}>
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={markAllRead} title="Mark all read">
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0 flex flex-col">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-4 opacity-20" />
              <p className="text-sm">You have no notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div key={n.id} className={cn("p-4 transition-colors", !n.is_read ? "bg-primary/5" : "bg-transparent")}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={cn("text-sm font-medium", !n.is_read && "text-primary")}>{n.title}</h4>
                    {!n.is_read && (
                      <button onClick={() => markAsRead(n.id)} className="text-muted-foreground hover:text-foreground">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground opacity-60">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
