import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { useSystemStore } from '../../stores/useSystemStore';
import { SplashLoader } from '../ui/SplashLoader';
import { useShallow } from 'zustand/react/shallow';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { authState, user } = useUserStore(useShallow(state => ({ authState: state.authState, user: state.user })));
  const { isMaintenanceMode } = useSystemStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait until the one true bootstrap process finishes
    if (authState === 'UNKNOWN' || authState === 'BOOTSTRAPPING') return;

    if (authState === 'UNAUTHENTICATED' || authState === 'GUEST') {
      // Always redirect to login when unauthenticated.
      // MaintenanceGuard wraps the auth routes and will redirect to /maintenance if needed.
      navigate('/login', { state: { from: location.pathname }, replace: true });
    } else if (authState === 'AUTHENTICATED' && user?.must_change_password && location.pathname !== '/force-password-change') {
      navigate('/force-password-change', { replace: true });
    }
  }, [authState, user, navigate, location, isMaintenanceMode]);

  // Always show a spinner — never render a black/blank screen while waiting
  if (authState === 'UNKNOWN' || authState === 'BOOTSTRAPPING') {
    return <SplashLoader message="Verifying session..." submessage="Securing your cloud workspace" />;
  }

  // If bootstrap finished but still not auth, we are about to redirect, show nothing to avoid flash of content
  if (authState === 'UNAUTHENTICATED' || authState === 'GUEST') return null;

  return <>{children}</>;
}
