import { toast } from 'sonner';
import { useSystemStore } from '../stores/useSystemStore';
import { useDeploymentStore } from '../stores/useDeploymentStore';

const API_BASE_URL = '/api/v1';



export async function fetchApi(endpoint: string, options: RequestInit & { _retry?: boolean } = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Create headers object, defaulting to JSON if not specified
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure cookies are sent with every request
  const config: RequestInit & { _retry?: boolean } = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    let response = await fetch(url, config);


    // 401s are handled by AuthController — let them propagate as thrown errors.

    const data = await response.json().catch(() => null);
    
    // 401 Interceptor: if it's a 401 and we haven't retried yet, and it's not an auth endpoint
    if (response.status === 401 && !options._retry) {
      const isAuthEndpoint = endpoint.includes('/auth/login') || 
                             endpoint.includes('/auth/register') || 
                             endpoint.includes('/auth/refresh') || 
                             endpoint.includes('/auth/logout') ||
                             endpoint.includes('/auth/me');
      if (!isAuthEndpoint) {
        config._retry = true;
        const { authController } = await import('../services/AuthController');
        const refreshed = await authController.refresh();
        if (refreshed) {
          // Retry the original request
          return fetchApi(endpoint, config);
        } else {
          // If refresh fails, explicitly move to UNAUTHENTICATED to trigger clean session-expiry UX
          const { useUserStore } = await import('../stores/useUserStore');
          if (useUserStore.getState().authState !== 'GUEST') {
            useUserStore.getState().setAuthState('UNAUTHENTICATED');
          }
          throw new Error('Authentication failed.');
        }
      }
    }

    if (!response.ok) {
      let errorMsg = data?.detail || data?.message || `API request failed (${response.status})`;
      
      // Handle structured detail object (e.g. for 2FA)
      if (data && data.detail && typeof data.detail === 'object') {
        errorMsg = data.detail.message || errorMsg;
      }

      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMsg = data.errors[0];
      }
      
      const isDeploying = useDeploymentStore?.getState?.()?.isDeploying;
      
      if (response.status === 502 || response.status === 504 || (response.status === 503 && !data)) {
        window.dispatchEvent(new Event('deployment:trigger'));
      } else if (response.status === 503 && data) {
        window.dispatchEvent(new Event('maintenance:active'));
        try {
          useSystemStore.setState({ isMaintenanceMode: true, hasChecked: true, isChecking: false });
        } catch {}
      } else if (response.status >= 500) {
        if (!isDeploying) {
          toast.error(`Server Error: ${errorMsg}`);
        }
      } else if (errorMsg === "ACCOUNT_SUSPENDED") {
        const { useUserStore } = await import('../stores/useUserStore');
        if (useUserStore.getState().authState !== 'SUSPENDED') {
          useUserStore.getState().setAuthState('SUSPENDED');
        }
      } else if (errorMsg === "ACCOUNT_DELETED") {
        const { useUserStore } = await import('../stores/useUserStore');
        if (useUserStore.getState().authState !== 'DELETED') {
          useUserStore.getState().clearAuth();
          useUserStore.getState().setAuthState('DELETED');
        }
      } else if (response.status === 403 || response.status === 429) {
        toast.error(errorMsg);
      }
      
      const error: any = new Error(errorMsg);
      error.data = data;
      error.status = response.status;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('Network'))) {
      window.dispatchEvent(new Event('deployment:trigger'));
    }
    throw error;
  }
}
