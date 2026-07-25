import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSystemStore } from "../../stores/useSystemStore";
import { useUserStore } from "../../stores/useUserStore";

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { isMaintenanceMode, checkStatus, isChecking, allowAdmin } = useSystemStore();
  const { user, isLoading } = useUserStore();
  const location = useLocation();
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);

  useEffect(() => {
    // Only check status ONCE on mount — not on every path change.
    // Re-checking on path change was causing repeated API calls during the redirect loop.
    checkStatus().then(() => setHasCheckedOnce(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow bypassing via URL parameter for development/preview purposes
  // This only bypasses the frontend UI block, the backend API will still reject requests
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("preview") === "true") {
      sessionStorage.setItem("maintenance_preview", "true");
    }
  }, [location.search]);

  // We no longer block on isChecking, so users don't see a spinner on every refresh.
  // AuthGuard already blocks on isLoading.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isPreview = typeof window !== "undefined" && sessionStorage.getItem("maintenance_preview") === "true";
  
  const isSuperAdmin = user?.role === "OWNER";
  const isNormalAdminOrMod = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const isAllowedToBypass = isSuperAdmin || (isNormalAdminOrMod && allowAdmin);

  const isExemptRoute = [
    "/maintenance",
    "/login",
    "/force-password-change",
    "/verify-email",
    "/oauth/callback",
    "/super-admin",
    "/app/admin",
  ].some(route => location.pathname.startsWith(route));
  
  if (isMaintenanceMode && !isAllowedToBypass && !isExemptRoute && !isPreview) {
    return <Navigate to="/maintenance" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
