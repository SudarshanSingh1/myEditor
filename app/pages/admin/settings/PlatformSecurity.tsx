import { useOutletContext } from "react-router-dom";
import { Shield, Monitor, FileKey, Database } from "lucide-react";
import { Toggle } from "./SettingsFormControls";
import type { Settings } from "./adminSettingsTypes";

interface ContextType {
  settings: Settings;
  set: (key: keyof Settings) => (val: boolean | number | string) => void;
}

export default function PlatformSecurity() {
  const { settings, set } = useOutletContext<ContextType>();

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-8 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[80px] rounded-full pointer-events-none" />
      <h2 className="text-sm font-bold text-violet-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Shield className="w-4 h-4" /> Platform Security
      </h2>
      <div className="relative z-10 space-y-1">
        <Toggle checked={settings.maintenance_mode} onChange={set("maintenance_mode")} label="Maintenance Mode" description="Blocks all non-admin access and displays the maintenance page." icon={Monitor} colorClass="bg-red-500" />
        <Toggle checked={settings.registration_enabled} onChange={set("registration_enabled")} label="User Registration" description="Allow new users to sign up for accounts." icon={FileKey} />
        <Toggle checked={settings.login_enabled} onChange={set("login_enabled")} label="User Authentication" description="Allow existing users to log in. Disable during emergency maintenance." icon={Shield} />
        <Toggle checked={settings.read_only_mode} onChange={set("read_only_mode")} label="Read-Only Mode" description="Prevents writes to the database (read-only access only)." icon={Database} colorClass="bg-amber-500" />
      </div>
    </div>
  );
}
