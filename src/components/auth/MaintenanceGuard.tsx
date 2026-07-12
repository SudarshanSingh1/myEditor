import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSystemStore } from "../../stores/useSystemStore";
import { useUserStore } from "../../stores/useUserStore";

export function MaintenanceGuard({ children }: { children: ReactNode }) {
  const { isMaintenanceMode, checkStatus, isChecking } = useSystemStore();
  const { user } = useUserStore();
  const location = useLocation();

  useEffect(() => {
    checkStatus();
  }, [checkStatus, location.pathname]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If maintenance mode is ON and user is NOT a SUPER_ADMIN
  // We allow SUPER_ADMIN to access the dashboard because they need to be able to turn it off.
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  if (isMaintenanceMode && !isSuperAdmin) {
    return <Navigate to="/maintenance" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
