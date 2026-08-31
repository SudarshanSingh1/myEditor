import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { fetchApi } from "../../lib/api";
import { SudarshanaMandala } from "../../components/ui/SplashLoader";
import { toast } from "sonner";
import { githubApi } from "../../lib/api/github";

export default function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const navigate = useNavigate();
  
  // Separate states for the two distinct flows
  const [error, setError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || !code) {
      setError("Invalid OAuth callback parameters.");
      return;
    }

    const exchangeCode = async () => {
      // ----------------------------------------------------------------
      // ACCOUNT LINKING FLOW
      // If the state parameter looks like a signed connect token (base64
      // encoded JSON with action=connect), this is an account-link
      // request from a logged-in user — NOT a login attempt.
      // ----------------------------------------------------------------
      const stateParam = searchParams.get("state");
      const isConnectFlow =
        provider === "github" &&
        stateParam &&
        (() => {
          try {
            const raw = atob(stateParam.replace(/-/g, "+").replace(/_/g, "/"));
            const lastDot = raw.lastIndexOf(".");
            if (lastDot < 0) return false;
            const payload = JSON.parse(raw.slice(0, lastDot));
            return payload.action === "connect";
          } catch {
            return false;
          }
        })();

      if (isConnectFlow) {
        try {
          const res = await fetchApi("/auth/oauth/github/connect-link", {
            method: "POST",
            body: JSON.stringify({ code, state: stateParam }),
          });
          if (res?.success && res?.data) {
            const { useGitHubStore } = await import("../../stores/useGitHubStore");
            await useGitHubStore.getState().fetchStatus();
            toast.success(`GitHub connected as @${res.data.github_username}`);
            // Navigate back to wherever they were
            const returnUrl = sessionStorage.getItem("oauth_redirect_url") || "/app/projects";
            sessionStorage.removeItem("oauth_redirect_url");
            navigate(returnUrl.startsWith("/") ? returnUrl : "/app/projects", { replace: true });
          }
        } catch (err: any) {
          // It's a connect flow error, so don't redirect to login!
          // We set connectError so the UI can show the specific "Already linked" view.
          setConnectError(err?.data?.detail || err.message || "Failed to link GitHub account.");
        }
        return;
      }

      // ----------------------------------------------------------------
      // NORMAL LOGIN FLOW — unchanged
      // ----------------------------------------------------------------
      try {
        const response = await fetchApi(`/auth/oauth/${provider}/callback`, {
          method: "POST",
          body: JSON.stringify({ code }),
        });

        if (response.success && response.data) {
          let userData = response.data.user;
          const { authController } = await import('../../services/AuthController');
          await authController.bootstrap(true);
          const userState = useUserStore.getState().user;
          if (userState) {
              userData = userState;
          } else {
              userData = { ...response.data.user, role: response.data.user.role || "USER" };
          }

          await useSystemStore.getState().checkStatus(true);
          const isMaint = useSystemStore.getState().isMaintenanceMode;
          const allowAdmin = useSystemStore.getState().allowAdmin;
          const role = (userData.role || "").toUpperCase();
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

          if (!userState) {
            useUserStore.getState().setAuthSuccess(userData, userData.effective_permissions || []);
          }
          toast.success(`Successfully logged in with ${provider}`);
          const redirectUrl = sessionStorage.getItem("oauth_redirect_url") || searchParams.get("state") || null;
          if (redirectUrl) sessionStorage.removeItem("oauth_redirect_url");

          if (redirectUrl && redirectUrl !== "/login" && redirectUrl !== "/admin-login" && redirectUrl !== "/maintenance" && !redirectUrl.startsWith("/maintenance")) {
            navigate(redirectUrl, { replace: true });
          } else if (isSuperAdmin) {
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
  }, [provider, code, navigate, searchParams]);

  // Specific Error View for the CONNECT flow (e.g. account already linked)
  if (connectError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white h-full">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center w-full max-w-md">
          <h2 className="mb-2 text-xl font-semibold text-red-400">GitHub Account Already Connected</h2>
          <p className="text-zinc-400 mb-6">{connectError}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                const returnUrl = sessionStorage.getItem("oauth_redirect_url") || "/app/projects";
                navigate(returnUrl);
              }}
              className="w-full rounded-md bg-white/10 px-4 py-2 hover:bg-white/20 transition-colors"
            >
              Back to Editor
            </button>
            <button
              onClick={() => githubApi.connect()}
              className="w-full rounded-md bg-transparent border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors"
            >
              Try Another GitHub Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal Login Flow Error View
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
