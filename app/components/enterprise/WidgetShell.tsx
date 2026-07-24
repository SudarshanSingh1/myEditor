import type { ReactNode } from "react";
import { MoreHorizontal, RefreshCw } from "lucide-react";

interface WidgetShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  onRefresh?: () => void;
  className?: string;
  noPadding?: boolean;
  isLoading?: boolean;
}

export function WidgetShell({
  title, subtitle, children, action, onRefresh, className = "", noPadding = false, isLoading = false
}: WidgetShellProps) {
  return (
    <div className={`e-widget ${className}`}>
      <div className="e-widget-header">
        <div>
          <p className="e-widget-title">{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: "var(--e-text-faint)", marginTop: 2 }}>{subtitle}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {action}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="e-btn e-btn-ghost e-btn-icon"
              title="Refresh"
              aria-label="Refresh widget"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>
      <div className={noPadding ? "" : "e-widget-body"}>{children}</div>
    </div>
  );
}

/** Simple skeleton block */
export function Skeleton({ h = 16, w = "100%", className = "" }: { h?: number; w?: string | number; className?: string }) {
  return (
    <div
      className={`e-skeleton ${className}`}
      style={{ height: h, width: w }}
    />
  );
}

/** Divider */
export function EDivider({ className = "" }: { className?: string }) {
  return <div className={`e-divider ${className}`} />;
}
