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
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0f]/80 overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0 opacity-50" />
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">Maintenance Mode</h2>
            <p className="text-sm text-gray-400 mt-1">Take the platform offline for updates or emergency fixes.</p>
          </div>
        </div>
        <div className="p-4 space-y-2 px-8">
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
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0f]/80 overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500 to-purple-500/0 opacity-50" />
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">Customization</h2>
            <p className="text-sm text-gray-400 mt-1">Configure what users see on the maintenance screen.</p>
          </div>
        </div>
        <div className="p-4 space-y-2 px-8">
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
              <div className="flex-1 w-full bg-[#12121a] border border-white/5 rounded-xl p-3 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
                <div className="flex items-center gap-3 ml-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Start (Now)</div>
                    <div className="text-sm font-medium text-white">{currentTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
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
              <div className="flex-1 w-full relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative bg-[#12121a] border border-white/10 rounded-xl p-3 overflow-hidden flex items-center">
                  <div className="absolute top-0 right-0 w-1 h-full bg-purple-500/50"></div>
                  <div className="flex items-center gap-3 ml-1 w-full">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> End Time
                      </div>
                      <input
                        type="datetime-local"
                        value={settings.maintenance_end_time ? new Date(new Date(settings.maintenance_end_time).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          set("maintenance_end_time")(val ? new Date(val).toISOString() : null);
                        }}
                        className="w-full bg-transparent text-sm font-medium text-white focus:outline-none appearance-none"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Duration Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 ml-2 md:ml-16">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500 mr-1 uppercase tracking-wider hidden sm:inline-block">Add:</span>
                {[
                  { label: "+1H", hours: 1 },
                  { label: "+3H", hours: 3 },
                  { label: "+12H", hours: 12 },
                  { label: "+24H", hours: 24 }
                ].map((btn) => (
                  <button 
                    key={btn.label}
                    onClick={() => { const d = new Date(); d.setHours(d.getHours() + btn.hours); set("maintenance_end_time")(d.toISOString()); }} 
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-indigo-500 hover:text-white text-gray-400 border border-white/5 hover:border-indigo-400 transition-all shadow-sm hover:shadow-indigo-500/25"
                  >
                    {btn.label}
                  </button>
                ))}
                <button 
                  onClick={() => set("maintenance_end_time")(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-red-500/20 hover:text-red-400 text-gray-400 border border-white/5 transition-all ml-1"
                  title="Clear end time"
                >
                  Clear
                </button>
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
