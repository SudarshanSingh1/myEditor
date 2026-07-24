import React, { useState, useEffect } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Internet connection restored.');
      // When internet returns, check backend immediately
      checkBackendStatus();
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error('Internet connection lost. You are offline.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to custom backend events we can dispatch from api.ts
  useEffect(() => {
    const handleBackendOffline = () => setIsBackendOffline(true);
    const handleBackendOnline = () => setIsBackendOffline(false);

    window.addEventListener('backend:offline', handleBackendOffline);
    window.addEventListener('backend:online', handleBackendOnline);

    return () => {
      window.removeEventListener('backend:offline', handleBackendOffline);
      window.removeEventListener('backend:online', handleBackendOnline);
    };
  }, []);

  const checkBackendStatus = async () => {
    try {
      // Just a simple ping to see if backend is reachable
      const response = await fetch('/api/v1/health'); // Assuming a health endpoint exists
      if (response.ok) {
        setIsBackendOffline(false);
        window.dispatchEvent(new Event('backend:online'));
      }
    } catch {
      // Still offline
    }
  };

  if (!isOffline && !isBackendOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-red-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isOffline ? 'You are offline.' : 'Backend is unreachable.'}
        </span>
      </div>
      
      {!isOffline && isBackendOffline && (
        <button 
          onClick={checkBackendStatus}
          className="text-xs bg-white text-red-500 px-3 py-1 rounded shadow hover:bg-red-50 transition flex items-center space-x-1"
        >
          <Loader2 className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
