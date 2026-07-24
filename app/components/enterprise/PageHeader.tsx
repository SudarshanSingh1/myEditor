import type { ReactNode } from "react";
import type { ElementType } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ElementType;
  iconColor?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  liveIndicator?: boolean;
  lastUpdate?: Date | null;
}

export function PageHeader({
  title, subtitle, icon: Icon, iconColor = "var(--e-accent-light)",
  actions, badge, liveIndicator = false, lastUpdate
}: PageHeaderProps) {
  return (
    <div className="e-page-header">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {Icon && (
          <div style={{
            width: 36, height: 36, borderRadius: "var(--e-radius-md)",
            background: "var(--e-bg-elevated)",
            border: "1px solid var(--e-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: iconColor, flexShrink: 0
          }}>
            <Icon size={18} />
          </div>
        )}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="e-page-title">{title}</h1>
            {badge}
          </div>
          <p className="e-page-subtitle">
            {subtitle}
            {liveIndicator && (
              <span style={{ marginLeft: 8, color: "var(--e-green)", fontWeight: 600 }}>
                ● Live{lastUpdate ? ` · ${lastUpdate.toLocaleTimeString()}` : ""}
              </span>
            )}
          </p>
        </div>
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/** Section divider with label */
export function SectionLabel({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 12,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--e-text-faint)",
      }}>
        {label}
      </p>
      {action}
    </div>
  );
}

/** Inline tag/badge */
export function EBadge({ children, color = "indigo" }: { children: ReactNode; color?: "green" | "red" | "amber" | "indigo" | "blue" | "gray" }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    green:  { bg: "var(--e-green-bg)",  text: "var(--e-green)",  border: "var(--e-green-border)" },
    red:    { bg: "var(--e-red-bg)",    text: "var(--e-red)",    border: "var(--e-red-border)" },
    amber:  { bg: "var(--e-amber-bg)",  text: "var(--e-amber)",  border: "var(--e-amber-border)" },
    indigo: { bg: "var(--e-bg-active)", text: "var(--e-accent-light)", border: "var(--e-border-accent)" },
    blue:   { bg: "var(--e-blue-bg)",   text: "var(--e-blue)",   border: "var(--e-blue-border)" },
    gray:   { bg: "var(--e-bg-elevated)", text: "var(--e-text-muted)", border: "var(--e-border)" },
  };
  const s = styles[color] || styles.gray;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 100,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>
      {children}
    </span>
  );
}

/** Quick action button strip */
interface QuickAction {
  label: string;
  icon?: ElementType;
  onClick?: () => void;
  to?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}

import { Link } from "react-router-dom";

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {actions.map((action, i) => {
        const Icon = action.icon;
        const cls = `e-btn e-btn-${action.variant || "secondary"}`;
        const inner = (
          <>
            {Icon && <Icon size={13} />}
            {action.label}
          </>
        );

        if (action.to) {
          return (
            <Link key={i} to={action.to} className={cls}>
              {inner}
            </Link>
          );
        }
        return (
          <button key={i} className={cls} onClick={action.onClick} disabled={action.disabled}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
