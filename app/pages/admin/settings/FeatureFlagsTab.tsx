import { ToggleLeft } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";

export default function FeatureFlagsTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
          <ToggleLeft className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Feature Flags</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage runtime toggles and rollout phases.</p>
        </div>
      </div>

      <div className="mt-8">
        <EmptyState 
          icon={ToggleLeft} 
          title="Coming Soon: Feature Flags" 
          description="Feature flags will allow you to toggle experimental features, manage runtime rollouts, and perform A/B testing safely without deploying new code. We're currently building this capability!"
        />
      </div>
    </div>
  );
}
