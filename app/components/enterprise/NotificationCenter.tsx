import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAdminContext } from "../auth/AdminAuthGuard";
import { useDeploymentStore } from "../../stores/useDeploymentStore";

interface AlertMessage {
  id: string;
  type: "warning" | "critical" | "info";
  message: string;
  source: string;
  timestamp: string;
}

export function NotificationCenter() {
  const { isSuperAdmin } = useAdminContext();
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: number;
    let attempts = 0;
    let isMounted = true;

    const connect = () => {
      if (!isMounted || useDeploymentStore.getState().isDeploying) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = import.meta.env.VITE_API_URL 
        ? new URL(import.meta.env.VITE_API_URL).host 
        : window.location.host;
        
      ws = new WebSocket(`${protocol}//${host}/api/v1/admin/alerts/ws`);
      
      ws.onopen = () => { attempts = 0; };
      
      ws.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const d = JSON.parse(e.data);
          if (d.alerts && Array.isArray(d.alerts)) {
            const newAlerts = d.alerts.map((a: any) => ({
              ...a,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: a.timestamp || new Date().toISOString()
            }));
            
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + newAlerts.length);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!isMounted || useDeploymentStore.getState().isDeploying) return;
        const backoff = Math.min(1000 * Math.pow(2, attempts++), 10000);
        reconnectTimeout = window.setTimeout(connect, backoff);
      };
    };

    const handleDeployStart = () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };

    const handleDeployEnd = () => {
      attempts = 0;
      connect();
    };

    window.addEventListener("deployment:start", handleDeployStart);
    window.addEventListener("deployment:end", handleDeployEnd);

    connect();

    return () => {
      isMounted = false;
      window.removeEventListener("deployment:start", handleDeployStart);
      window.removeEventListener("deployment:end", handleDeployEnd);
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [isSuperAdmin]);

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const clearAll = () => {
    setAlerts([]);
    setUnreadCount(0);
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setUnreadCount(0);
  };

  if (!isSuperAdmin) return null;

  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={handleOpen}
        style={{
          background: "none",
          border: "none",
          color: "var(--e-text-muted)",
          cursor: "pointer",
          position: "relative",
          padding: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--e-radius-sm)",
          transition: "background 150ms"
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--e-bg-surface-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            background: "var(--e-red)",
            borderRadius: "50%",
            border: "2px solid var(--e-bg-base)"
          }} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              width: 320,
              background: "var(--e-bg-surface)",
              border: "1px solid var(--e-border)",
              borderRadius: "var(--e-radius-lg)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              zIndex: 100,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: 400
            }}
          >
            <div style={{ 
              padding: "12px 16px", 
              borderBottom: "1px solid var(--e-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.02)"
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--e-text-primary)" }}>Notifications</span>
              {alerts.length > 0 && (
                <button 
                  onClick={clearAll}
                  style={{ background: "none", border: "none", color: "var(--e-blue)", fontSize: 11, cursor: "pointer" }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: alerts.length === 0 ? 32 : 0 }}>
              {alerts.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--e-text-faint)", fontSize: 12 }}>
                  <Bell size={24} style={{ margin: "0 auto 8px", opacity: 0.2 }} />
                  No new notifications
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--e-border)",
                    display: "flex",
                    gap: 12,
                    position: "relative"
                  }}>
                    <div style={{ marginTop: 2 }}>
                      {alert.type === "critical" ? <AlertTriangle size={16} color="var(--e-red)" /> : 
                       alert.type === "warning" ? <AlertCircle size={16} color="var(--e-amber)" /> :
                       <Info size={16} color="var(--e-blue)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "var(--e-text-primary)", fontWeight: 500, lineHeight: 1.4 }}>
                        {alert.message}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--e-text-muted)", marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
                        <span>{alert.source}</span>
                        <span>•</span>
                        <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeAlert(alert.id)}
                      style={{ background: "none", border: "none", color: "var(--e-text-faint)", cursor: "pointer", padding: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
