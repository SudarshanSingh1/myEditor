import { useOutletContext } from "react-router-dom";
import { Mail, Server, Monitor, FileKey, Shield, RotateCcw } from "lucide-react";
import { TextInput, NumberInput, Toggle } from "./SettingsFormControls";
import type { Settings } from "./adminSettingsTypes";

interface ContextType {
  settings: Settings;
  set: (key: keyof Settings) => (val: boolean | number | string) => void;
  testing: boolean;
  testSmtp: () => void;
  testStatus: "idle" | "success" | "error";
}

export default function EmailSmtp() {
  const { settings, set, testing, testSmtp, testStatus } = useOutletContext<ContextType>();

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-8 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-pink-400 uppercase tracking-widest flex items-center gap-2">
          <Mail className="w-4 h-4" /> Email & SMTP Configuration
        </h2>
        <div className="flex items-center gap-3">
          {testStatus === "success" && (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              Connected
            </span>
          )}
          {testStatus === "error" && (
            <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
              Failed
            </span>
          )}
          <button
            onClick={testSmtp}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 text-xs font-medium disabled:opacity-50 transition-colors border border-pink-500/30"
          >
            {testing ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            {testing ? "Testing..." : "Send Test Email"}
          </button>
        </div>
      </div>
      
      <div className="relative z-10 space-y-1">
        <TextInput value={settings.smtp_host} onChange={set("smtp_host")} label="SMTP Host" description="The hostname of your SMTP server (e.g. smtp.gmail.com)" placeholder="smtp.example.com" icon={Server} />
        <NumberInput value={settings.smtp_port} onChange={set("smtp_port")} label="SMTP Port" description="Usually 587 (TLS) or 465 (SSL)." min={1} max={65535} icon={Monitor} />
        <TextInput value={settings.smtp_user} onChange={set("smtp_user")} label="SMTP Username" description="Username or email address for SMTP authentication." placeholder="user@example.com" icon={FileKey} />
        <TextInput value={settings.smtp_pass} onChange={set("smtp_pass")} type="password" label="SMTP Password" description="Password or app-specific password." placeholder="••••••••" icon={Shield} />
        
        <div className="h-px w-full bg-white/5 my-4" />
        
        <TextInput value={settings.smtp_from_name} onChange={set("smtp_from_name")} label="From Name" description="The name displayed as the sender." placeholder="Hamara Editor" />
        <TextInput value={settings.smtp_from_email} onChange={set("smtp_from_email")} label="From Email" description="The email address displayed as the sender." placeholder="noreply@example.com" />
        
        <div className="h-px w-full bg-white/5 my-4" />
        
        <Toggle checked={settings.smtp_tls} onChange={set("smtp_tls")} label="Use TLS" description="Enable STARTTLS encryption (port 587)." colorClass="bg-pink-500" />
        <Toggle checked={settings.smtp_ssl} onChange={set("smtp_ssl")} label="Use SSL" description="Enable SSL encryption (port 465)." colorClass="bg-pink-500" />
      </div>
    </div>
  );
}
