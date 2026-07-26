import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { useSystemStore } from '../../stores/useSystemStore';
import { SplashLoader } from '../ui/SplashLoader';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useUserStore();
  const { isMaintenanceMode } = useSystemStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Always redirect to login when unauthenticated.
      // MaintenanceGuard wraps the auth routes and will redirect to /maintenance if needed.
      navigate('/login', { state: { from: location.pathname }, replace: true });
    } else if (isAuthenticated && user?.must_change_password && location.pathname !== '/force-password-change') {
      navigate('/force-password-change', { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate, location, isMaintenanceMode]);

  // Always show a spinner — never render a black/blank screen
  if (isLoading || !isAuthenticated) {
    return <SplashLoader message="Verifying session..." submessage="Securing your cloud workspace" />;
  }

  return <>{children}</>;
}
