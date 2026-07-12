import React from "react";

export function Toggle({ checked, onChange, label, description, icon: Icon, colorClass }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string; icon?: any; colorClass?: string }) {
  const activeColor = colorClass || "bg-violet-500";
  return (
    <div className="flex items-center justify-between py-5 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors rounded-xl px-4 -mx-4">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white transition-colors">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">{label}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${checked ? activeColor : "bg-white/10"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export function NumberInput({ value, onChange, label, description, min, max, unit, icon: Icon }: {
  value: number; onChange: (v: number) => void; label: string; description: string;
  min?: number; max?: number; unit?: string; icon?: any;
}) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors rounded-xl px-4 -mx-4">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white transition-colors">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">{label}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white text-right focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
        />
        {unit && <span className="text-xs font-medium text-gray-500 w-8">{unit}</span>}
      </div>
    </div>
  );
}

export function TextInput({ value, onChange, label, description, placeholder, type = "text", icon: Icon }: {
  value: string; onChange: (v: string) => void; label: string; description: string; placeholder?: string; type?: string; icon?: any;
}) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors rounded-xl px-4 -mx-4">
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white transition-colors">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">{label}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
        />
      </div>
    </div>
  );
}
