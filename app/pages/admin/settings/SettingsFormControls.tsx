import React from "react";

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 16px", borderBottom: "1px solid var(--e-border)",
  transition: "background 120ms",
};
const iconWrap: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
  background: "var(--e-bg-elevated)",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "var(--e-text-muted)",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--e-text-primary)", marginBottom: 2 };
const descStyle: React.CSSProperties  = { fontSize: 11, color: "var(--e-text-muted)", lineHeight: 1.4 };
const inputBase: React.CSSProperties = {
  background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
  borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "var(--e-text-primary)",
  outline: "none", transition: "border-color 150ms",
};

export function Toggle({
  checked, onChange, label, description, icon: Icon, colorClass,
}: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description: string; icon?: any; colorClass?: string;
}) {
  const trackOn  = colorClass === "bg-red-500"  ? "#dc2626"
                 : colorClass === "bg-cyan-500"  ? "#0891b2"
                 : "#4f46e5";
  return (
    <div style={rowStyle}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--e-bg-elevated)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, paddingRight: 16 }}>
        {Icon && (
          <div style={iconWrap}><Icon size={16} strokeWidth={1.5} /></div>
        )}
        <div>
          <p style={labelStyle}>{label}</p>
          <p style={descStyle}>{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          position: "relative", width: 44, height: 24, borderRadius: 12, flexShrink: 0,
          background: checked ? trackOn : "#e2e8f0",
          border: "none", cursor: "pointer", transition: "background 200ms", padding: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: checked ? 22 : 3,
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 200ms",
          display: "block",
        }} />
      </button>
    </div>
  );
}

export function NumberInput({
  value, onChange, label, description, min, max, unit, icon: Icon,
}: {
  value: number; onChange: (v: number) => void; label: string; description: string;
  min?: number; max?: number; unit?: string; icon?: any;
}) {
  return (
    <div style={rowStyle}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--e-bg-elevated)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, paddingRight: 16 }}>
        {Icon && <div style={iconWrap}><Icon size={16} strokeWidth={1.5} /></div>}
        <div>
          <p style={labelStyle}>{label}</p>
          <p style={descStyle}>{description}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <input
          type="number" value={value} min={min} max={max}
          onChange={e => onChange(Number(e.target.value))}
          style={{ ...inputBase, width: 80, textAlign: "right", fontFamily: "monospace" }}
          onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#4f46e5"}
          onBlur={e  => (e.target as HTMLInputElement).style.borderColor = "var(--e-border)"}
        />
        {unit && <span style={{ fontSize: 11, color: "var(--e-text-muted)", width: 28 }}>{unit}</span>}
      </div>
    </div>
  );
}

export function TextInput({
  value, onChange, label, description, placeholder, type = "text", icon: Icon,
}: {
  value: string; onChange: (v: string) => void; label: string; description: string;
  placeholder?: string; type?: string; icon?: any;
}) {
  return (
    <div style={rowStyle}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--e-bg-elevated)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, paddingRight: 16 }}>
        {Icon && <div style={iconWrap}><Icon size={16} strokeWidth={1.5} /></div>}
        <div>
          <p style={labelStyle}>{label}</p>
          <p style={descStyle}>{description}</p>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputBase, width: 200, fontFamily: type === "text" ? "monospace" : undefined }}
          onFocus={e => (e.target as HTMLInputElement).style.borderColor = "#4f46e5"}
          onBlur={e  => (e.target as HTMLInputElement).style.borderColor = "var(--e-border)"}
        />
      </div>
    </div>
  );
}
