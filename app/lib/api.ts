import { toast } from 'sonner';
import { useSystemStore } from '../stores/useSystemStore';
import { useUserStore } from '../stores/useUserStore';
import { useDeploymentStore } from '../stores/useDeploymentStore';

const API_BASE_URL = '/api/v1';

export function resetUnauthorizedFlag() {
  // Now handled by AuthController state machine.
  useUserStore.getState().setAuthInvalid(false);
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
    const userStore = useUserStore.getState();
    if (userStore.authInvalid && endpoint !== '/auth/login' && endpoint !== '/guest/init') {
      throw new Error('Session terminated.');
    }

    let response = await fetch(url, config);

    // Basic 401 logic: just throw if unauthorized, let AuthController handle it.
    if (response.status === 401) {
       // We can optionally dispatch an event here if we wanted to loosely couple, 
       // but AuthController handles explicit calls. Just throw for standard API queries.
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
