import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSystemStore } from "../../stores/useSystemStore";
import { useUserStore } from "../../stores/useUserStore";

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { isMaintenanceMode, checkStatus, isChecking } = useSystemStore();
  const { user } = useUserStore();
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

  // Show loading spinner until the first check completes
  if (isChecking || !hasCheckedOnce) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isPreview = sessionStorage.getItem("maintenance_preview") === "true";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const isAuthRoute = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/force-password-change"
  ].some(route => location.pathname.startsWith(route));
  
  if (isMaintenanceMode && !isAdmin && !isAuthRoute && !isPreview) {
    return <Navigate to="/maintenance" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
