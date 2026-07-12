import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { logSystemError } from '../../lib/systemErrorService';

interface FallbackProps {
  error: any;
  resetErrorBoundary: () => void;
  title?: string;
}

const DefaultFallback = ({ error, resetErrorBoundary, title = "Something went wrong" }: FallbackProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-background text-foreground text-center">
      <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md break-words">
        {error.message}
      </p>
      <div className="flex space-x-4">
        <button
          onClick={resetErrorBoundary}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(error.stack || error.message);
            toast.success('Error copied to clipboard');
          }}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          Copy Error
        </button>
      </div>
    </div>
  );
};

export const PanelErrorBoundary: React.FC<{ children: React.ReactNode; panelName?: string }> = ({ children, panelName }) => {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => <DefaultFallback {...props} title={`${panelName || 'Component'} Error`} />}
      onError={(error: any, info: any) => {
        console.error(`[Panel Error: ${panelName}]`, error);
        logSystemError(error, info);
        toast.error(`Error in ${panelName || 'panel'}: ${error?.message || 'Unknown error'}`);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export const GlobalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => <DefaultFallback {...props} title="A fatal error occurred" />}
      onError={(error: any, info: any) => {
        console.error('[Global Error]', error);
        logSystemError(error, info);
        toast.error('A critical application error occurred.');
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
