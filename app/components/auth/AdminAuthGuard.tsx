import { Navigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { createContext, useContext, type ReactNode } from "react";
import { SplashLoader } from "../ui/SplashLoader";

export type AdminRole = "MODERATOR" | "ADMIN" | "OWNER";

interface AdminContextValue {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  adminRole: AdminRole | null;
}

const AdminContext = createContext<AdminContextValue>({
  isSuperAdmin: false,
  isAdmin: false,
  isModerator: false,
  adminRole: null,
});

// oxlint-disable-next-line react/only-export-components
// eslint-disable-next-line react-refresh/only-export-components
export const useAdminContext = () => useContext(AdminContext);

interface AdminAuthGuardProps {
  children: ReactNode;
  requiredPermission?: string;
}

export function AdminAuthGuard({ children, requiredPermission }: AdminAuthGuardProps) {
  const { user, permissions, isAuthenticated, isLoading } = useUserStore();

  if (isLoading) {
    return <SplashLoader variant="admin" message="Loading admin console..." submessage="Securing executive access & permissions" />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toUpperCase() as AdminRole;
  const isSuperAdmin = role === "OWNER";
  const isAdmin = role === "ADMIN" || isSuperAdmin;
  const isModerator = role === "MODERATOR";
  const hasAccess = isAdmin || isModerator || permissions.includes('*') || permissions.includes('users.read.basic');

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  if (requiredPermission && !isSuperAdmin && !permissions.includes(requiredPermission) && !permissions.includes('*')) {
    return <Navigate to="/403" replace />;
  }

  return (
    <AdminContext.Provider value={{ isSuperAdmin, isAdmin, isModerator, adminRole: role }}>
      {children}
    </AdminContext.Provider>
  );
}
