import { useEffect, useState } from "react";
import { useDeploymentStore } from "../../stores/useDeploymentStore";
import { useEditorStore } from "../../stores/useEditorStore";
import { onlineManager } from "@tanstack/react-query";
import { Rocket, Server, RefreshCw } from "lucide-react";

export function DeploymentManager() {
  const {
    isDeploying,
    isReconnecting,
    showUpdateComplete,
    serverVersion,
    setIsDeploying,
    setIsReconnecting,
    setShowUpdateComplete,
    setServerVersion
  } = useDeploymentStore();

  const [countdown, setCountdown] = useState(3);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Initialize server version on mount — endpoint is at /api/version (health router prefix)
  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.build_number) {
          setServerVersion(data.data.build_number);
        } else if (data?.data?.backend_version) {
          setServerVersion(data.data.backend_version);
        }
      })
      .catch(() => {});
  }, [setServerVersion]);

  // Listen for deployment trigger from api.ts interceptor
  useEffect(() => {
    const handleTrigger = () => {
      if (!useDeploymentStore.getState().isDeploying) {
        setIsDeploying(true);
        setIsReconnecting(false);
        onlineManager.setOnline(false); // Pause React Query
        // Dispatch start event for websockets to listen
        window.dispatchEvent(new Event("deployment:start"));
      }
    };
    window.addEventListener("deployment:trigger", handleTrigger);
    return () => window.removeEventListener("deployment:trigger", handleTrigger);
  }, [setIsDeploying, setIsReconnecting]);

  // Poll server during deployment
  useEffect(() => {
    if (!isDeploying) return;

    let pollTimer: number;
    let isMounted = true;

    const pollServer = async () => {
      if (!isMounted) return;
      try {
        setIsReconnecting(true);
        const res = await fetch("/api/version", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        
        if (res.ok) {
          const data = await res.json();
          const fetchedVersion = data?.data?.build_number || data?.data?.backend_version;
          
          if (isMounted) {
            setIsDeploying(false);
            setIsReconnecting(false);
            
            // Check for version update
            const currentVersion = useDeploymentStore.getState().serverVersion;
            
            if (currentVersion && fetchedVersion && currentVersion !== fetchedVersion) {
              setNewVersion(fetchedVersion);
              setShowUpdateComplete(true);
              
              // Check for unsaved changes
              const dirty = Object.values(useEditorStore.getState().dirtyFiles).some(Boolean);
              setHasUnsaved(dirty);
            } else {
              // Same version, just reconnected
              resumeApp();
            }
          }
        } else {
          pollTimer = window.setTimeout(pollServer, 3000);
        }
      } catch (e) {
        pollTimer = window.setTimeout(pollServer, 3000);
      }
    };

    pollServer();

    return () => {
      isMounted = false;
      clearTimeout(pollTimer);
    };
  }, [isDeploying, setIsDeploying, setIsReconnecting, setShowUpdateComplete]);

  // Handle countdown and reload when update is complete
  useEffect(() => {
    if (!showUpdateComplete) return;

    if (hasUnsaved) {
      // Don't force reload if they have unsaved work
      return;
    }

    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      window.location.reload();
    }
  }, [showUpdateComplete, countdown, hasUnsaved]);

  const resumeApp = () => {
    onlineManager.setOnline(true);
    window.dispatchEvent(new Event("deployment:end"));
  };

  const handleManualReload = () => {
    window.location.reload();
  };

  if (!isDeploying && !showUpdateComplete) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        
        {isDeploying && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center relative">
              <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-ping" />
              <Server className="w-8 h-8 text-blue-400" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Hamara Editor is updating</h2>
              <p className="text-gray-400 text-sm">
                We're deploying a new version to the servers. Your work is safe and will not be lost.
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full border border-white/5">
              <RefreshCw className={`w-4 h-4 text-blue-400 ${isReconnecting ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium text-blue-400">
                {isReconnecting ? "Checking server..." : "Waiting..."}
              </span>
            </div>
          </div>
        )}

        {showUpdateComplete && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-green-400" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Update Complete! 🎉</h2>
              <p className="text-gray-400 text-sm">
                Successfully updated to version {newVersion || "latest"}.
              </p>
            </div>

            {hasUnsaved ? (
              <div className="w-full mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-sm font-medium mb-3">
                  You have unsaved changes. Please save your work, then reload the page to apply the update.
                </p>
                <button
                  onClick={handleManualReload}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Reload Now
                </button>
                <button
                  onClick={() => setShowUpdateComplete(false)}
                  className="w-full mt-2 py-2 bg-transparent text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="text-sm text-gray-400">Reloading automatically in...</p>
                <div className="text-3xl font-bold text-white">{countdown}</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
