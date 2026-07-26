/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSystemStore } from "../../stores/useSystemStore";
import { useUserStore } from "../../stores/useUserStore";

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const {
    isMaintenanceMode,
    checkStatus,
    isChecking: _maintenanceChecking,
    hasChecked: maintenanceChecked,
  } = useSystemStore();
  const { isLoading: userLoading } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();

  // ─── Initial status check on mount ───────────────────────────────────────
  useEffect(() => {
    checkStatus();
  }, []);

  // ─── Poll every 30 s so mid-session toggles propagate quickly ────────────
  useEffect(() => {
    const id = setInterval(() => checkStatus(), 30000);
    return () => clearInterval(id);
  }, []);

  // ─── React to 503 events fired by api.ts on any blocked request ──────────
  useEffect(() => {
    const handler = () => checkStatus();
    window.addEventListener("maintenance:active", handler);
    return () => window.removeEventListener("maintenance:active", handler);
  }, []);

  // ─── Preview bypass (dev/staging) ────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("preview") === "true") {
      sessionStorage.setItem("maintenance_preview", "true");
    }
  }, [location.search]);

  // ─── Calculate status & hooks before ANY conditional returns (Rules of Hooks) ───
  const isPreview =
    typeof window !== "undefined" &&
    sessionStorage.getItem("maintenance_preview") === "true";

  const { user, permissions } = useUserStore();
  const { allowAdmin } = useSystemStore();
  const role = user?.role || "";
  const isSuperAdmin = role === "OWNER";
  const isAdminOrMod = role === "ADMIN" || role === "MODERATOR";
  const perms = user?.effective_permissions || permissions || [];
  const isAllowedToBypass = isSuperAdmin || perms.includes("*") || perms.includes("system.maintenance.bypass") || (isAdminOrMod && allowAdmin);

  const isAllowedPublicRoute =
    location.pathname.startsWith("/maintenance") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/admin-login") ||
    location.pathname.startsWith("/oauth/callback");

  const isBlocked =
    isMaintenanceMode &&
    !isAllowedToBypass &&
    !isPreview &&
    !isAllowedPublicRoute;

  const isReady = maintenanceChecked && !userLoading;

  useEffect(() => {
    if (isReady && isBlocked) {
      navigate("/maintenance", { replace: true, state: { from: location.pathname } });
    }
  }, [isReady, isBlocked, navigate, location.pathname]);

  // ─── Never block /maintenance route with spinners or checks ──────────────
  if (location.pathname.startsWith("/maintenance")) {
    return <>{children}</>;
  }

  // ─── CRITICAL: Block rendering until BOTH checks complete ────────────────
  // If we render before either check is done, the defaults (isMaintenanceMode=false,
  // user=null) cause children to render and the maintenance redirect never fires.
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }


  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}



