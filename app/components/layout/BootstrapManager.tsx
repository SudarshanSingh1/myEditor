import React, { useEffect } from 'react';
import { authController } from '../../services/AuthController';

/**
 * BootstrapManager — non-blocking application initializer.
 *
 * Renders children immediately so public routes (/, /login, /signup) are
 * visible at once. Authentication and system status checks run as background
 * tasks; protected routes are gated by AuthGuard which reacts to authState
 * transitions via useUserStore.
 *
 * This matches the startup model used by Linear, Notion and GitHub:
 * render the shell first, hydrate auth state in the background.
 */
export function BootstrapManager({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Run bootstrap once on mount. authController is a singleton so concurrent
    // calls (e.g. StrictMode double-invoke) are deduped by bootstrapPromise.
    authController.bootstrap();
  }, []);

  // Always render children immediately — no blocking SplashLoader here.
  // AuthGuard handles the auth-pending state for protected /app/* routes.
  return <>{children}</>;
}

