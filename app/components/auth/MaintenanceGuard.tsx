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
  } = useSystemStore();
  const { isLoading: userLoading } = useUserStore();
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

  // Let's compute authorization directly from current state/localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const userRole = useUserStore.getState().user?.role?.toUpperCase();
  const isStaffRole = userRole === "OWNER" || userRole === "ADMIN" || userRole === "MODERATOR";
  const userPerms = useUserStore.getState().permissions || [];
  const hasBypassPerm = userPerms.includes("*") || userPerms.includes("system.maintenance.bypass");
  const allowAdmin = useSystemStore.getState().allowAdmin;

  const canBypass = isStaffRole && (userRole === "OWNER" || userRole === "ADMIN" || hasBypassPerm || allowAdmin);

  // Define routes that are considered "inside" the app, admin portals, or authentication flows.
  // When maintenance mode is active, admins can bypass maintenance ONLY on these internal/auth routes.
  // Visiting public marketing routes like the landing page (/) will redirect to /maintenance so even admins can view the maintenance screen.
  const isInsideOrAuthRoute =
    location.pathname.startsWith("/app") ||
    location.pathname.startsWith("/super-admin") ||
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
    location.pathname.startsWith("/cookies");

  // If we have a token but user hasn't loaded yet, don't prematurely redirect
  const isBlocked = isMaintenanceMode && (!isInsideOrAuthRoute || !canBypass) && !(token && !useUserStore.getState().user);

  useEffect(() => {
    if (!isReady) return;

    if (isBlocked && !location.pathname.startsWith("/maintenance")) {
      navigate("/maintenance", { replace: true });
    }
  }, [isReady, isBlocked, navigate, location.pathname]);

  // Never block /maintenance route with spinners or checks
  if (location.pathname.startsWith("/maintenance")) {
    return <>{children}</>;
  }

  // Block rendering until BOTH checks complete
  if (!isReady) {
    return <SplashLoader message="Checking system status..." submessage="Connecting to Hamara Editor platform" />;
  }

  if (isBlocked) {
    return <SplashLoader message="Redirecting to maintenance..." submessage="System offline for updates" />;
  }

  return <>{children}</>;
}
