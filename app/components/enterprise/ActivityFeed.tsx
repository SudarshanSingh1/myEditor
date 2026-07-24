import type { ReactNode } from "react";

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  type?: "info" | "success" | "warning" | "error" | "system";
  actor?: string;
}

const TYPE_COLORS: Record<string, string> = {
  info:    "var(--e-blue)",
  success: "var(--e-green)",
  warning: "var(--e-amber)",
  error:   "var(--e-red)",
  system:  "var(--e-purple)",
};

interface ActivityFeedProps {
  items: ActivityItem[];
  maxHeight?: number;
  emptyText?: string;
}

export function ActivityFeed({ items, maxHeight = 320, emptyText = "No recent activity." }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "var(--e-text-faint)", fontSize: 13 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ maxHeight, overflowY: "auto", padding: "0 2px" }}
      className="e-content"
    >
      {items.map((item) => (
        <div key={item.id} className="e-feed-item">
          <span
            className="e-feed-dot"
            style={{ background: TYPE_COLORS[item.type || "info"] }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {item.actor && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--e-text-secondary)", marginRight: 4 }}>
                {item.actor}
              </span>
            )}
            <span className="e-feed-text">{item.text}</span>
          </div>
          <span className="e-feed-time">{item.time}</span>
        </div>
      ))}
    </div>
  );
}

/** Timeline item for deployments / events */
interface TimelineItem {
  id: string;
  label: string;
  desc?: string;
  time: string;
  status: "success" | "running" | "failed" | "pending";
  icon?: ReactNode;
}

const TIMELINE_COLORS: Record<string, string> = {
  success: "var(--e-green)",
  running: "var(--e-blue)",
  failed:  "var(--e-red)",
  pending: "var(--e-amber)",
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div style={{ position: "relative" }}>
      {/* Vertical line */}
      <div style={{
        position: "absolute", left: 15, top: 8, bottom: 8,
        width: 1, background: "var(--e-border)"
      }} />

      {items.map((item, i) => (
        <div key={item.id} style={{ display: "flex", gap: 14, padding: "8px 0", position: "relative" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "var(--e-bg-elevated)",
            border: `2px solid ${TIMELINE_COLORS[item.status]}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, zIndex: 1,
            boxShadow: `0 0 8px ${TIMELINE_COLORS[item.status]}40`,
          }}>
            {item.icon || (
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: TIMELINE_COLORS[item.status]
              }} />
            )}
          </div>
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--e-text-primary)" }}>{item.label}</p>
              <span style={{ fontSize: 10, color: "var(--e-text-faint)", whiteSpace: "nowrap", marginLeft: 8 }}>{item.time}</span>
            </div>
            {item.desc && (
              <p style={{ fontSize: 12, color: "var(--e-text-muted)", marginTop: 2 }}>{item.desc}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
