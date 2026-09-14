import { useEffect } from 'react';
import { authController } from './services/AuthController';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router-dom";
import "./index.css";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ConfirmProvider } from './components/ui/ConfirmProvider';
import { Toaster } from 'sonner';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap" rel="stylesheet" />
        <link rel="preload" as="image" href="/images/hamara-editor-icon.svg" fetchPriority="high" />
        <Meta />
        <Links />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ConfirmProvider>
            {children}
            <Toaster position="top-right" theme="dark" richColors closeButton />
          </ConfirmProvider>
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        authController.checkSessionHealth();
      }
    };
    
    const handleOnline = () => {
      authController.checkSessionHealth();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return <Outlet />;
}

export function HydrateFallback() {
  return <p>Loading...</p>;
}

export function ErrorBoundary() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
      <div className="flex max-w-md flex-col items-center space-y-4 text-center">
        <h1 className="text-4xl font-bold text-red-500">Critical Error</h1>
        <p className="text-zinc-400">
          The application encountered an unexpected error. Please try refreshing the page.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}
