import { fetchApi } from './api';
import { logger } from './logger';

export const logSystemError = async (error: Error, errorInfo?: any) => {
  try {
    const stackTrace = `${error.stack || error.message}\n\nComponent Stack:\n${errorInfo?.componentStack || ''}`;
    
    await fetchApi('/system-errors/', {
      method: 'POST',
      body: JSON.stringify({
        route: window.location.pathname,
        browser: navigator.userAgent,
        stack_trace: stackTrace
      })
    });
  } catch (e) {
    // Silently fail if we can't log the error to avoid infinite loops
    logger.error('Failed to log system error to backend', e);
  }
};
