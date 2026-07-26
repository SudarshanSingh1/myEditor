/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSystemStore } from "../../stores/useSystemStore";
import { useUserStore } from "../../stores/useUserStore";
import { SplashLoader } from "../ui/SplashLoader";

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const {
    isMaintenanceMode,
    checkStatus,
    isChecking: _maintenanceChecking,
    hasChecked: maintenanceChecked,
    allowAdmin,
  } = useSystemStore();
  const { isLoading: userLoading, user, permissions = [] } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Trigger check if not done
  useEffect(() => {
    if (!maintenanceChecked && !_maintenanceChecking) {
      checkStatus();
    }
  }, [maintenanceChecked, _maintenanceChecking, checkStatus]);

  // Poll every 30 s so mid-session toggles propagate quickly
  useEffect(() => {
    const id = setInterval(() => checkStatus(), 30000);
    return () => clearInterval(id);
  }, []);

  // React to 503 events fired by api.ts on any blocked request
  useEffect(() => {
    const handler = () => checkStatus();
    window.addEventListener("maintenance:active", handler);
    return () => window.removeEventListener("maintenance:active", handler);
  }, []);

  const isReady = maintenanceChecked && !userLoading;

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

  // Never block auth or maintenance routes so staff can always log in and guests can see maintenance screen
  if (isAuthOrLegalRoute) {
    return <>{children}</>;
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const userRole = user?.role?.toUpperCase();
  const isStaffRole = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MODERATOR";
  const hasBypassPerm = permissions.includes("*") || permissions.includes("system.maintenance.bypass");

  // Staff roles (Owner, Admin, Moderator) or users with bypass permission are always authorized to bypass maintenance
  const canBypass = isStaffRole || hasBypassPerm || allowAdmin;

  // If we have a token but user hasn't loaded yet, don't prematurely redirect
  const isBlocked = isMaintenanceMode && !canBypass && !(token && !user);

  useEffect(() => {
    if (!isReady) return;

    if (isBlocked && !location.pathname.startsWith("/maintenance")) {
      navigate("/maintenance", { replace: true });
    }
  }, [isReady, isBlocked, navigate, location.pathname]);

  // Block rendering until BOTH checks complete
  if (!isReady) {
    return <SplashLoader />;
  }

  if (isBlocked) {
    return <SplashLoader />;
  }

  return <>{children}</>;
}
