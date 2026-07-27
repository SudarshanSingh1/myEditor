import { Lock } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";

export default function SecretsTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Secrets Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Secure vault for environment variables and credentials.</p>
        </div>
      </div>

      <div className="mt-8">
        <EmptyState 
          icon={Lock} 
          title="Coming Soon: Secrets Management" 
          description="Secrets management will provide a secure vault to store environment variables, database credentials, and tokens, injecting them into execution environments securely at runtime. We're currently building this capability!"
        />
      </div>
    </div>
  );
}
