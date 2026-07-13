import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { useSystemStore } from '../../stores/useSystemStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useUserStore();
  const { isMaintenanceMode } = useSystemStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // During maintenance mode, don't redirect to login — let MaintenanceGuard handle it.
      // This prevents the /app → /login → /maintenance → /app bounce loop.
      if (!isMaintenanceMode) {
        navigate('/login', { state: { from: location.pathname }, replace: true });
      }
    } else if (!isLoading && isAuthenticated && user?.must_change_password && location.pathname !== '/force-password-change') {
      navigate('/force-password-change', { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate, location, isMaintenanceMode]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
