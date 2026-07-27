import { useOutletContext } from "react-router-dom";
import type { Settings } from "./adminSettingsTypes";
import { Toggle, TextInput } from "./SettingsFormControls";
import { Shield } from "lucide-react";

export default function OAuthSettings() {
  const { settings, set } = useOutletContext<{
    settings: Settings;
    set: (key: keyof Settings) => (val: any) => void;
  }>();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">OAuth Configurations</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Enable third-party authentication providers.</p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">Google OAuth</h3>
        <Toggle
          label="Enable Google Sign-In"
          checked={settings.oauth_google_enabled}
          onChange={set("oauth_google_enabled")}
          description="Allow users to authenticate using their Google accounts."
        />
        {settings.oauth_google_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-black/10 dark:border-white/10">
            <TextInput
              label="Client ID"
              value={settings.oauth_google_client_id}
              onChange={set("oauth_google_client_id")}
              description=""
            />
            <TextInput
              label="Client Secret (Encrypted)"
              value={settings.oauth_google_client_secret}
              onChange={set("oauth_google_client_secret")}
              type="password"
              description=""
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-2">GitHub OAuth</h3>
        <Toggle
          label="Enable GitHub Sign-In"
          checked={settings.oauth_github_enabled}
          onChange={set("oauth_github_enabled")}
          description="Allow users to authenticate using their GitHub accounts."
        />
        {settings.oauth_github_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-black/10 dark:border-white/10">
            <TextInput
              label="Client ID"
              value={settings.oauth_github_client_id}
              onChange={set("oauth_github_client_id")}
              description=""
            />
            <TextInput
              label="Client Secret (Encrypted)"
              value={settings.oauth_github_client_secret}
              onChange={set("oauth_github_client_secret")}
              type="password"
              description=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
