import { useOutletContext } from "react-router-dom";
import { Zap, Monitor, FileKey, Shield } from "lucide-react";
import { NumberInput } from "./SettingsFormControls";
import type { Settings } from "./adminSettingsTypes";

interface ContextType {
  settings: Settings;
  set: (key: keyof Settings) => (val: boolean | number | string) => void;
}

export default function ResourceQuotas() {
  const { settings, set } = useOutletContext<ContextType>();

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-8 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
      <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Zap className="w-4 h-4" /> Resource & Quotas
      </h2>
      <div className="relative z-10 space-y-1">
        <NumberInput value={settings.max_execution_time_seconds} onChange={set("max_execution_time_seconds")} label="Max Execution Time" description="Maximum time a program can run before timeout." min={5} max={300} unit="sec" icon={Zap} />
        <NumberInput value={settings.max_memory_mb} onChange={set("max_memory_mb")} label="Max Memory" description="Maximum memory a container can use." min={64} max={2048} unit="MB" icon={Monitor} />
        <NumberInput value={settings.max_file_size_mb} onChange={set("max_file_size_mb")} label="Max File Size" description="Maximum file size users can upload or create." min={1} max={100} unit="MB" icon={FileKey} />
        <NumberInput value={settings.max_projects_per_user} onChange={set("max_projects_per_user")} label="Max Projects Per User" description="Maximum number of projects a user can create." min={1} max={500} icon={Monitor} />
        <NumberInput value={settings.rate_limit_per_minute} onChange={set("rate_limit_per_minute")} label="Global API Rate Limit" description="Maximum API requests per minute per user." min={10} max={1000} unit="/min" icon={Shield} />
      </div>
    </div>
  );
}
