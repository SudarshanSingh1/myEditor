import { Navigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { createContext, useContext, type ReactNode } from "react";

export type AdminRole = "ADMIN" | "SUPER_ADMIN";

interface AdminContextValue {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
}

const AdminContext = createContext<AdminContextValue>({
  isSuperAdmin: false,
  isAdmin: false,
  adminRole: null,
});

export const useAdminContext = () => useContext(AdminContext);

interface AdminAuthGuardProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export function AdminAuthGuard({ children, requireSuperAdmin = false }: AdminAuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useUserStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-sm text-gray-400">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toUpperCase() as AdminRole;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN" || isSuperAdmin;

  if (!isAdmin) {
    return <Navigate to="/403" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/403" replace />;
  }

  return (
    <AdminContext.Provider value={{ isSuperAdmin, isAdmin, adminRole: role }}>
      {children}
    </AdminContext.Provider>
  );
}
