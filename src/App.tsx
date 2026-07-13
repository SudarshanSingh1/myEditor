import { useEffect } from "react";
import { AppRouter } from "./routes";
import { useUserStore } from "./stores/useUserStore";
import { useSystemStore } from "./stores/useSystemStore";
import { resetUnauthorizedFlag } from "./lib/api";

import { Toaster } from 'sonner';
import { NetworkStatus } from './components/network/NetworkStatus';
import { GlobalErrorBoundary } from './components/error/ErrorBoundaries';
import { ConfirmProvider } from './components/ui/ConfirmProvider';

function App() {
  const { checkAuth } = useUserStore();

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      useUserStore.setState({ user: null, isAuthenticated: false, isLoading: false });
    };

    const handleMaintenance = () => {
      useSystemStore.setState({ isMaintenanceMode: true });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('maintenance:active', handleMaintenance);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('maintenance:active', handleMaintenance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GlobalErrorBoundary>
      <NetworkStatus />
      <ConfirmProvider>
        <AppRouter />
      </ConfirmProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </GlobalErrorBoundary>
  );
}

export default App;
