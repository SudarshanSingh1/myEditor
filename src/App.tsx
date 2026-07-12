import { useEffect } from "react";
import { AppRouter } from "./routes";
import { useUserStore } from "./stores/useUserStore";

import { Toaster } from 'sonner';
import { NetworkStatus } from './components/network/NetworkStatus';
import { GlobalErrorBoundary } from './components/error/ErrorBoundaries';
import { ConfirmProvider } from './components/ui/ConfirmProvider';

function App() {
  const { checkAuth } = useUserStore();

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      useUserStore.setState({ user: null, isAuthenticated: false });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [checkAuth]);

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
