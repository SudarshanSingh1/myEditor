import { toast } from 'sonner';

const API_BASE_URL = '/api/v1';

let refreshPromise: Promise<Response> | null = null;

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
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
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
        // Refresh failed, clear auth state
        toast.error('Session expired. Please log in again.');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `API request failed (${response.status})`;
      
      // Don't show toast for 404s on /projects/:id if we handle it in UI
      // But generally show toasts for 5xx and other 4xx
      if (response.status >= 500) {
        toast.error(`Server Error: ${errorMsg}`);
      } else if (response.status === 403 || response.status === 429) {
        toast.error(errorMsg);
      }
      
      throw new Error(errorMsg);
    }
    
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}
