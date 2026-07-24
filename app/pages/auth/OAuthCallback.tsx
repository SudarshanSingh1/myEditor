import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { fetchApi } from "../../lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const navigate = useNavigate();
  const { login } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || !code) {
      setError("Invalid OAuth callback parameters.");
      return;
    }

    const exchangeCode = async () => {
      try {
        // Step 1: Exchange the code for tokens
        const response = await fetchApi(`/auth/oauth/${provider}/callback`, {
          method: "POST",
          body: JSON.stringify({ code }),
        });

        if (response.success && response.data) {
          // Step 2: Fetch the full profile to get the real role
          let userData = response.data.user;
          try {
            const profileResp = await fetchApi("/auth/me");
            if (profileResp.success && profileResp.data) {
              userData = profileResp.data;
            }
          } catch {
            // If /auth/me fails (e.g. maintenance), use what the oauth response gave us
            userData = { ...response.data.user, role: "USER" };
          }

          login(userData);
          toast.success(`Successfully logged in with ${provider}`);

          // Step 3: Refresh maintenance status and apply same logic as email Login
          await useSystemStore.getState().checkStatus();
          const { isMaintenanceMode, allowAdmin } = useSystemStore.getState();

          if (isMaintenanceMode) {
            const role = (userData.role as string) || "USER";
            const isSuperAdmin = role === "SUPER_ADMIN";
            const isAdminOrMod = role === "ADMIN" || role === "MODERATOR";
            const canBypass = isSuperAdmin || (isAdminOrMod && allowAdmin);

            if (!canBypass) {
              navigate("/maintenance", { replace: true });
              return;
            }
          }

          navigate("/app/dashboard");
        }
      } catch (err: any) {
        // Check if maintenance mode caused the failure
        const { isMaintenanceMode } = useSystemStore.getState();
        const errorText = (err.message || "").toLowerCase();
        const isMaintenanceError =
          errorText.includes("maintenance") ||
          errorText.includes("upgrade") ||
          errorText.includes("scheduled");

        if (isMaintenanceMode || isMaintenanceError) {
          navigate("/maintenance", { replace: true });
          return;
        }

        setError(err.message || "Failed to complete OAuth login");
        toast.error("OAuth login failed");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    exchangeCode();
  }, [provider, code, navigate, login]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white h-full">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center w-full max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-red-400">OAuth Error</h2>
          <p className="text-zinc-400">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 w-full rounded-md bg-white/10 px-4 py-2 hover:bg-white/20 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-white h-full">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <p className="text-lg font-medium text-zinc-300">Completing login with {provider}...</p>
        <p className="text-sm text-zinc-500">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
}
