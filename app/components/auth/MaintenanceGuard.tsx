/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSystemStore } from "../../stores/useSystemStore";
import { useUserStore } from "../../stores/useUserStore";
import { SplashLoader } from "../ui/SplashLoader";
import { useShallow } from 'zustand/react/shallow';

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const {
    isMaintenanceMode,
    checkStatus,
    isChecking: _maintenanceChecking,
    hasChecked: maintenanceChecked,
    allowAdmin,
  } = useSystemStore();
  const { isLoading: userLoading, user, permissions = [] } = useUserStore(useShallow(state => ({ isLoading: state.isLoading, user: state.user, permissions: state.permissions })));
  const location = useLocation();
  const navigate = useNavigate();

  // Trigger check if not done
  useEffect(() => {
    if (!maintenanceChecked && !_maintenanceChecking) {
      checkStatus();
    }
  }, [maintenanceChecked, _maintenanceChecking, checkStatus]);

  // Maintenance mode is propagated reactively via the maintenance:active window
  // event (fired by api.ts on any 503 response). No periodic polling needed.

  // React to 503 events fired by api.ts on any blocked request
  useEffect(() => {
    const handler = () => checkStatus();
    window.addEventListener("maintenance:active", handler);
    return () => window.removeEventListener("maintenance:active", handler);
  }, []);

  const isReady = maintenanceChecked;

  // Define auth, legal, and maintenance routes that must never be blocked by maintenance mode
  // This ensures staff (Owner, Admin, Moderator) can visit /admin-login, /login, or /oauth to sign in!
  const isAuthOrLegalRoute =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/admin-login") ||
    location.pathname.startsWith("/signup") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/verify-email") ||
    location.pathname.startsWith("/force-password-change") ||
    location.pathname.startsWith("/oauth") ||
    location.pathname.startsWith("/403") ||
    location.pathname.startsWith("/privacy") ||
    location.pathname.startsWith("/terms") ||
    location.pathname.startsWith("/cookies") ||
    location.pathname.startsWith("/maintenance");

  const userRole = (user?.role || "").toUpperCase();
  const isStaffRole = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MODERATOR";
  const perms = permissions.length > 0 ? permissions : (user?.effective_permissions || []);
  const hasBypassPerm = perms.includes("*") || perms.includes("system.maintenance.bypass");

  // Owner can always bypass. Other staff roles (Admin, Moderator) or users with bypass permission can bypass if allowAdmin is enabled.
  const canBypass = userRole === "OWNER" || (allowAdmin && (isStaffRole || hasBypassPerm));

  // If user is currently loading, don't prematurely block or redirect when using HttpOnly cookies
  const isBlocked = isMaintenanceMode && !canBypass && !(!user && userLoading);

  useEffect(() => {
    if (!isReady || isAuthOrLegalRoute) return;

    if (isBlocked && !location.pathname.startsWith("/maintenance")) {
      navigate("/maintenance", { replace: true });
    }
  }, [isReady, isAuthOrLegalRoute, isBlocked, navigate, location.pathname]);

  // Never block auth or maintenance routes so staff can always log in and guests can see maintenance screen
  if (isAuthOrLegalRoute) {
    return <>{children}</>;
  }

  // Block rendering until BOTH checks complete
  if (!isReady) {
    return <SplashLoader />;
  }

  if (isBlocked) {
    return <SplashLoader />;
  }

  return <>{children}</>;
}
