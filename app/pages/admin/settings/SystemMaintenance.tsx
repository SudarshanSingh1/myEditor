import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Settings } from "./adminSettingsTypes";
import { Wrench, Settings as SettingsIcon, AlertTriangle, ShieldAlert, Clock, Power, ArrowRight, Calendar } from "lucide-react";
import { Toggle, TextInput } from "./SettingsFormControls";

interface ContextType {
  settings: Settings;
  set: (key: keyof Settings) => (val: boolean | number | string | null) => void;
  save: () => void;
  saving: boolean;
}

export default function SystemMaintenance() {
  const { settings, set } = useOutletContext<ContextType>();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Warning Alert if Active */}
      {settings.maintenance_mode && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-400 font-medium text-sm mb-1">Maintenance Mode is ACTIVE</h4>
            <p className="text-red-400/80 text-sm">
              All normal users are currently being redirected to the maintenance screen. Only administrators can access the platform.
            </p>
          </div>
        </div>
      )}

      {/* Maintenance Mode Toggle Card */}
      <div style={{ borderRadius: 16, border: "1px solid var(--e-border)", background: "var(--e-bg-surface)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: "linear-gradient(90deg, transparent, #0891b2, transparent)", opacity: 0.6 }} />
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--e-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 8, borderRadius: 10, background: "rgba(8,145,178,0.10)", color: "#0891b2" }}>
            <Wrench size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--e-text-primary)" }}>Maintenance Mode</h2>
            <p style={{ fontSize: 12, color: "var(--e-text-muted)", marginTop: 2 }}>Take the platform offline for updates or emergency fixes.</p>
          </div>
        </div>
        <div style={{ padding: "4px 20px" }}>
          <Toggle
            label="Enable Maintenance Mode"
            description="Immediately redirects all non-admin users to the maintenance screen."
            checked={settings.maintenance_mode}
            onChange={(v) => set("maintenance_mode")(v)}
            icon={Power}
            colorClass="bg-red-500"
          />
          <Toggle
            label="Allow Admin Access"
            description="If enabled, standard Admins and Moderators can bypass the maintenance block. (Super Admins are always allowed)."
            checked={settings.maintenance_allow_admin_access}
            onChange={(v) => set("maintenance_allow_admin_access")(v)}
            icon={ShieldAlert}
            colorClass="bg-cyan-500"
          />
          <Toggle
            label="Show Countdown Timer"
            description="Displays a countdown timer on the maintenance page based on the estimated end time."
            checked={settings.maintenance_show_countdown}
            onChange={(v) => set("maintenance_show_countdown")(v)}
            icon={Clock}
            colorClass="bg-cyan-500"
          />
        </div>
      </div>

      {/* Customization Card */}
      <div style={{ borderRadius: 16, border: "1px solid var(--e-border)", background: "var(--e-bg-surface)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, background: "linear-gradient(90deg, transparent, #7c3aed, transparent)", opacity: 0.6 }} />
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--e-border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 8, borderRadius: 10, background: "rgba(124,58,237,0.10)", color: "#7c3aed" }}>
            <SettingsIcon size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--e-text-primary)" }}>Customization</h2>
            <p style={{ fontSize: 12, color: "var(--e-text-muted)", marginTop: 2 }}>Configure what users see on the maintenance screen.</p>
          </div>
        </div>
        <div style={{ padding: "4px 20px" }}>
          <TextInput
            label="Maintenance Message"
            description="The public message displayed to users."
            placeholder="e.g. System is undergoing scheduled upgrades."
            value={settings.maintenance_message}
            onChange={(v) => set("maintenance_message")(v)}
          />
          
          <div className="flex flex-col py-5 border-b border-white/5 last:border-0 group transition-colors rounded-xl px-4 -mx-4 gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Clock className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-base font-semibold text-white tracking-wide">Maintenance Duration</p>
                  <p className="text-sm text-gray-400 mt-1">Set the estimated end time. The system will automatically recover when this time passes.</p>
                </div>
              </div>
            </div>

            {/* Timeline UI */}
            <div className="flex flex-col md:flex-row items-center gap-4 mt-2 ml-2 md:ml-16">
              
              {/* From (Now) */}
              <div style={{ flex: 1, width: "100%", background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)", borderLeft: "3px solid #16a34a", borderRadius: 10, padding: 12, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 8px rgba(22,163,74,0.6)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--e-text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Start (Now)</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--e-text-primary)" }}>{currentTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </div>
                </div>
              </div>

              {/* Connecting Line */}
              <div className="hidden md:flex items-center justify-center shrink-0 w-16 relative">
                <div className="absolute w-full h-[2px] bg-gradient-to-r from-emerald-500/20 via-indigo-500/50 to-purple-500/80"></div>
                <ArrowRight className="w-5 h-5 text-purple-400 relative z-10 bg-[#0a0a0f] px-0.5 rounded-full" />
              </div>
              <div className="md:hidden flex items-center justify-center h-8 shrink-0 relative w-full">
                <div className="absolute h-full w-[2px] bg-gradient-to-b from-emerald-500/20 via-indigo-500/50 to-purple-500/80"></div>
                <ArrowRight className="w-5 h-5 text-purple-400 relative z-10 bg-[#0a0a0f] py-0.5 rounded-full transform rotate-90" />
              </div>

              {/* To (Target) */}
              <div style={{ flex: 1, width: "100%", background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)", borderRight: "3px solid #7c3aed", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 8px rgba(124,58,237,0.6)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={10} /> End Time
                    </div>
                    <input
                      type="datetime-local"
                      value={settings.maintenance_end_time ? new Date(new Date(settings.maintenance_end_time).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        set("maintenance_end_time")(val ? new Date(val).toISOString() : null);
                      }}
                      style={{ width: "100%", background: "transparent", fontSize: 13, fontWeight: 500, color: "var(--e-text-primary)", border: "none", outline: "none" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Duration Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 ml-2 md:ml-16">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-var(--e-text-muted) mr-1 uppercase tracking-wider hidden sm:inline-block">Add:</span>
                {[
                  { label: "+1H", hours: 1 },
                  { label: "+3H", hours: 3 },
                  { label: "+12H", hours: 12 },
                  { label: "+24H", hours: 24 },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => { const d = new Date(); d.setHours(d.getHours() + btn.hours); set("maintenance_end_time")(d.toISOString()); }}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                      background: "var(--e-bg-elevated)", color: "var(--e-text-secondary)",
                      border: "1px solid var(--e-border)", transition: "all 150ms",
                    }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(99,102,241,0.1)"; (e.target as HTMLButtonElement).style.color = "#4f46e5"; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "var(--e-bg-elevated)"; (e.target as HTMLButtonElement).style.color = "var(--e-text-secondary)"; }}
                  >{btn.label}</button>
                ))}
                <button
                  onClick={() => set("maintenance_end_time")(null)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                    background: "var(--e-bg-elevated)", color: "var(--e-text-secondary)",
                    border: "1px solid var(--e-border)", transition: "all 150ms", marginLeft: 4,
                  }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "#fef2f2"; (e.target as HTMLButtonElement).style.color = "#dc2626"; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "var(--e-bg-elevated)"; (e.target as HTMLButtonElement).style.color = "var(--e-text-secondary)"; }}
                >Clear</button>
              </div>

              {/* Duration Badge */}
              <div className="flex items-center">
                {settings.maintenance_end_time ? (
                  (() => {
                    const diffMs = new Date(settings.maintenance_end_time).getTime() - currentTime.getTime();
                    if (diffMs <= 0) return <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">Expired</span>;
                    
                    const totalMins = Math.floor(diffMs / 60000);
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    const durationText = h > 0 ? `${h}h ${m}m` : `${m}m`;
                    
                    return (
                      <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Duration: {durationText}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-xs font-medium text-gray-500 italic">No end time set</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
