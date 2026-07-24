import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ElementType } from "react";
import { Skeleton } from "./WidgetShell";

interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: ElementType;
  iconColor?: string;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  to?: string;
  isLoading?: boolean;
  compact?: boolean;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp size={12} />;
  if (trend === "down") return <TrendingDown size={12} />;
  return <Minus size={12} />;
}

export function MetricCard({
  label, value, subtext, icon: Icon, iconColor = "var(--e-accent-light)",
  iconBg = "var(--e-bg-active)", trend, trendValue, to, isLoading = false, compact = false
}: MetricCardProps) {
  const content = (
    <div className="e-metric-card" style={{ height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p className="e-metric-label">{label}</p>
        {Icon && (
          <div style={{
            width: 30, height: 30, borderRadius: "var(--e-radius-md)",
            background: iconBg, display: "flex", alignItems: "center",
            justifyContent: "center", color: iconColor, flexShrink: 0
          }}>
            <Icon size={15} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <Skeleton h={compact ? 28 : 36} w="60%" />
          <Skeleton h={12} w="40%" />
        </div>
      ) : (
        <>
          <p className="e-metric-value" style={{ fontSize: compact ? 24 : 32 }}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {trend && trendValue && (
              <span
                className={`e-trend-${trend}`}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600 }}
              >
                <TrendIcon trend={trend} />
                {trendValue}
              </span>
            )}
            {subtext && <span className="e-metric-sub">{subtext}</span>}
          </div>
        </>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} style={{ textDecoration: "none", display: "block" }}>{content}</Link>;
  }
  return content;
}

/** Compact KPI strip for dense dashboards */
export function KPIRow({ items }: {
  items: Array<{ label: string; value: string | number; color?: string }>
}) {
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRight: i < items.length - 1 ? "1px solid var(--e-border)" : "none",
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--e-text-muted)", marginBottom: 4 }}>
            {item.label}
          </p>
          <p style={{ fontSize: 20, fontWeight: 800, color: item.color || "var(--e-text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
