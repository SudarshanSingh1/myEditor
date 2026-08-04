import { toast } from 'sonner';
import { useSystemStore } from '../stores/useSystemStore';
import { useUserStore } from '../stores/useUserStore';
import { useDeploymentStore } from '../stores/useDeploymentStore';

const API_BASE_URL = '/api/v1';

let refreshPromise: Promise<Response> | null = null;
// Track if we've already fired the unauthorized event this session
// to prevent flooding the event bus on every failed request.
let hasDispatchedUnauthorized = false;

export function resetUnauthorizedFlag() {
  hasDispatchedUnauthorized = false;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Create headers object, defaulting to JSON if not specified
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure cookies are sent with every request
  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    let response = await fetch(url, config);

    // Basic 401 interceptor logic: if unauthorized, maybe token expired
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh' && endpoint !== '/auth/logout') {
      const isLoggingOut = useUserStore.getState().isLoggingOut;
      if (isLoggingOut) {
        throw new Error('Session terminated.');
      }
      if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }).finally(() => {
          refreshPromise = null;
        });
      }

      const refreshResp = await refreshPromise;

      if (refreshResp.ok) {
        // Retry original request
        response = await fetch(url, config);
      } else {
        // Refresh failed — fire unauthorized ONCE, not on every request
        if (!hasDispatchedUnauthorized) {
          hasDispatchedUnauthorized = true;
          if (endpoint !== '/auth/me') {
            toast.error('Session expired. Please log in again.');
            window.location.href = '/login?expired=true';
          } else {
            window.dispatchEvent(new Event('auth:unauthorized'));
          }
        }
      }
    }

    const data = await response.json().catch(() => null);
    
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
