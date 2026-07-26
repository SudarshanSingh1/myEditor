import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { fetchApi } from "../../lib/api";
import { SudarshanaMandala } from "../../components/ui/SplashLoader";
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
            userData = { ...response.data.user, role: response.data.user.role || "USER" };
          }



          await useSystemStore.getState().checkStatus(true);
          const isMaint = useSystemStore.getState().isMaintenanceMode;
          const allowAdmin = useSystemStore.getState().allowAdmin;
          const role = userData.role || "";
          const isSuperAdmin = role === "OWNER";
          const isAdminOrMod = role === "ADMIN" || role === "MODERATOR";
          const perms: string[] = userData.effective_permissions || [];
          const canBypass = isSuperAdmin || perms.includes("*") || perms.includes("system.maintenance.bypass") || ((isAdminOrMod) && allowAdmin);
          const isStaff = isSuperAdmin || isAdminOrMod || canBypass;
          const isAdminPortal = sessionStorage.getItem("admin_login_portal") === "true";
          sessionStorage.removeItem("admin_login_portal");

          if (isAdminPortal && !isStaff) {
            await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            toast.error("Access Denied: Restricted to Administrators, Moderators, and Owners only.");
            navigate("/admin-login", { replace: true });
            return;
          }

          if (isMaint && !canBypass) {
            await fetchApi("/auth/logout", { method: "POST" }).catch(() => {});
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            toast.error("System is under maintenance. Only administrators can log in.");
            navigate("/maintenance", { replace: true });
            return;
          }

          login(userData);
          toast.success(`Successfully logged in with ${provider}`);
          const redirectUrl = sessionStorage.getItem("oauth_redirect_url") || searchParams.get("state") || null;
          if (redirectUrl) sessionStorage.removeItem("oauth_redirect_url");

          if (redirectUrl && redirectUrl !== "/login" && redirectUrl !== "/admin-login") {
            navigate(redirectUrl, { replace: true });
          } else if (isAdminPortal) {
            navigate("/super-admin", { replace: true });
          } else if (isAdminOrMod) {
            navigate("/app/admin", { replace: true });
          } else {
            navigate("/app/dashboard", { replace: true });
          }
        }
      } catch (err: any) {
        if (err?.status === 503 || err?.message?.toLowerCase().includes("maintenance") || err?.data?.detail?.toLowerCase().includes("maintenance")) {
          toast.error("System is currently under maintenance. Only administrators can log in.");
          navigate("/maintenance", { replace: true });
          return;
        }
        setError(err.message || "Failed to complete OAuth login");
        toast.error(err.message || "OAuth login failed");
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
        <SudarshanaMandala className="w-16 h-16" color="purple" />
        <p className="text-lg font-medium text-zinc-300">Completing login with {provider}...</p>
        <p className="text-sm text-zinc-500">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
}
