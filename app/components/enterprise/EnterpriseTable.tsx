import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  label: string;
  width?: number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
}

interface EnterpriseTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyText?: string;
  emptyIcon?: ReactNode;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  compact?: boolean;
}

export function EnterpriseTable<T extends { id: string | number }>({
  columns, data, isLoading = false, emptyText = "No data found.",
  emptyIcon, skeletonRows = 5, onRowClick, compact = false
}: EnterpriseTableProps<T>) {
  const pad = compact ? "7px 12px" : "10px 14px";

  return (
    <div className="e-table-wrapper">
      <table className="e-table" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  textAlign: col.align || "left",
                  padding: compact ? "8px 12px" : "10px 14px",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i}>
                {columns.map((col, j) => (
                  <td key={j} style={{ padding: pad }}>
                    <div
                      className="e-skeleton"
                      style={{
                        height: 14,
                        width: `${55 + ((i * 7 + j * 3) % 30)}%`,
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--e-text-faint)",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}>
                  {emptyIcon && <div style={{ opacity: 0.4 }}>{emptyIcon}</div>}
                  {emptyText}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? "pointer" : undefined }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ padding: pad, textAlign: col.align || "left" }}
                  >
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Paginator component */
export function Paginator({
  page, total, perPage, onPage
}: {
  page: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      borderTop: "1px solid var(--e-border)",
      fontSize: 12,
      color: "var(--e-text-muted)",
    }}>
      <span>Showing {start}–{end} of {total.toLocaleString()}</span>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          className="e-btn e-btn-secondary e-btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          style={{ opacity: page <= 1 ? 0.4 : 1 }}
        >
          ← Prev
        </button>
        <span style={{
          padding: "4px 10px",
          background: "var(--e-bg-active)",
          borderRadius: "var(--e-radius-sm)",
          color: "var(--e-accent-light)",
          fontWeight: 700,
          fontSize: 11,
        }}>
          {page} / {totalPages}
        </span>
        <button
          className="e-btn e-btn-secondary e-btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          style={{ opacity: page >= totalPages ? 0.4 : 1 }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
