import { Key } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";

export default function ApiKeysTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">API Keys</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage programmatic access tokens.</p>
        </div>
      </div>

      <div className="mt-8">
        <EmptyState 
          icon={Key} 
          title="Coming Soon: API Keys" 
          description="API Keys will allow developers to authenticate programmatic requests to the platform, enabling external integrations and CI/CD automation. We're currently building this capability!"
        />
      </div>
    </div>
  );
}
