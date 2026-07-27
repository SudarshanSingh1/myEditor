import { useOutletContext } from "react-router-dom";

import type { Settings } from "./adminSettingsTypes";

import { TextInput } from "./SettingsFormControls";
import { Globe } from "lucide-react";

export default function GeneralSettings() {
  const { settings, set } = useOutletContext<{
    settings: Settings;
    set: (key: keyof Settings) => (val: any) => void;
  }>();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Globe className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">General Configuration</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextInput
          label="Application Name"
          value={settings.app_name}
          onChange={set("app_name")}
          description="The display name of your platform."
        />
        <TextInput
          label="Default Timezone"
          value={settings.default_timezone}
          onChange={set("default_timezone")}
          description="E.g., UTC, America/New_York"
        />
      </div>
    </div>
  );
}
