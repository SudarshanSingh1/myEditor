import { useState } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Bell, Send } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { WidgetShell } from "../../components/enterprise/WidgetShell";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("BROADCAST");
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = new URLSearchParams({ title, message, type });
      const res = await fetchApi(`/notifications/broadcast?${q}`, { method: "POST" });
      if (res?.success) {
        toast.success(res.message);
        setTitle("");
        setMessage("");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to broadcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="Notification Center"
        subtitle="Send global broadcasts and system alerts to all platform users"
        icon={Bell}
        iconColor="var(--e-amber)"
      />

      <div style={{ padding: "20px 24px" }}>
        <WidgetShell title="Send Broadcast" subtitle="Reach all active users instantly">
          <form onSubmit={handleBroadcast} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Type", id: "type", type: "select", options: [
                { value: "BROADCAST",   label: "Standard Broadcast" },
                { value: "SYSTEM",      label: "System Notice" },
                { value: "SECURITY",    label: "Security Alert" },
                { value: "MAINTENANCE", label: "Maintenance Notice" },
              ]},
            ].map(f => (
              <div key={f.id}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--e-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  style={{ width: "100%", background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)", borderRadius: "var(--e-radius-md)", padding: "8px 12px", fontSize: 13, color: "var(--e-text-primary)", outline: "none" }}
                >
                  <option value="BROADCAST"   style={{ background: "#0d0e1a" }}>Standard Broadcast</option>
                  <option value="SYSTEM"      style={{ background: "#0d0e1a" }}>System Notice</option>
                  <option value="SECURITY"    style={{ background: "#0d0e1a" }}>Security Alert</option>
                  <option value="MAINTENANCE" style={{ background: "#0d0e1a" }}>Maintenance Notice</option>
                </select>
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--e-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="e.g. Scheduled Maintenance"
                style={{ width: "100%", background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)", borderRadius: "var(--e-radius-md)", padding: "8px 12px", fontSize: 13, color: "var(--e-text-primary)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--e-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)} required rows={5}
                placeholder="Detailed message for all users..."
                style={{ width: "100%", background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)", borderRadius: "var(--e-radius-md)", padding: "8px 12px", fontSize: 13, color: "var(--e-text-primary)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={loading} className="e-btn e-btn-primary" style={{ gap: 8, opacity: loading ? 0.6 : 1 }}>
                <Send size={13} />
                {loading ? "Sending..." : "Send to All Users"}
              </button>
            </div>
          </form>
        </WidgetShell>
      </div>
    </div>
  );
}
