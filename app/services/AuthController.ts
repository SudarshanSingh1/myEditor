import { useUserStore } from '../stores/useUserStore';
import { useSystemStore } from '../stores/useSystemStore';
import { fetchApi } from '../lib/api';
import { queryClient } from '../lib/queryClient';

class AuthController {
  private bootstrapPromise: Promise<boolean> | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private guestPromise: Promise<boolean> | null = null;

  async bootstrap(force = false): Promise<boolean> {
    if (this.bootstrapPromise && !force) return this.bootstrapPromise;

    const state = useUserStore.getState();
    if (state.authState === 'BOOTSTRAPPING' && !force) {
      return false; // already bootstrapping
    }

    if (state.authState !== 'UNKNOWN' && !force) {
      return state.authState === 'AUTHENTICATED';
    }

    this.bootstrapPromise = (async () => {
      console.log("[AUTH] AUTH_BOOTSTRAP_START");
      useUserStore.getState().setAuthState('BOOTSTRAPPING');

      // Check maintenance status first
      const { checkStatus, hasChecked } = useSystemStore.getState();
      if (!hasChecked) {
        await checkStatus();
      }

      try {
        console.log("[AUTH] AUTH_ME_REQUEST");
        const response = await fetchApi('/auth/me');
        if (response.success && response.data) {
          let perms: string[] = response.data.effective_permissions || [];
          try {
            const permResp = await fetchApi('/rbac/my-permissions');
            if (permResp && permResp.permissions) {
              perms = permResp.permissions;
            }
          } catch (e) {
            console.error("Failed to fetch permissions", e);
          }
          const userWithPerms = { ...response.data, effective_permissions: perms };
          useUserStore.getState().setAuthSuccess(userWithPerms, perms);
          console.log("[AUTH] AUTH_STATE_CHANGED", "AUTHENTICATED");
          console.log("[AUTH] AUTH_BOOTSTRAP_END");
          return true;
        } else {
          return await this.handleBootstrapFailure();
        }
      } catch (error: any) {
        // Any error, we try refresh / guest fallback
        return await this.handleBootstrapFailure();
      } finally {
        this.bootstrapPromise = null;
      }
    })();

    return this.bootstrapPromise;
  }

  private async handleBootstrapFailure(): Promise<boolean> {
    const refreshed = await this.refresh();
    if (refreshed) {
      // Retry auth/me once after refresh
      console.log("[AUTH] AUTH_ME_REQUEST (Retry after refresh)");
      try {
        const retryResp = await fetchApi('/auth/me');
        if (retryResp.success && retryResp.data) {
           let perms = retryResp.data.effective_permissions || [];
           useUserStore.getState().setAuthSuccess({ ...retryResp.data, effective_permissions: perms }, perms);
           console.log("[AUTH] AUTH_STATE_CHANGED", "AUTHENTICATED");
           console.log("[AUTH] AUTH_BOOTSTRAP_END");
           return true;
        }
      } catch (e) {}
    }
    
    // If refresh failed, or retry failed, init guest
    const guestOk = await this.initGuest();
    if (guestOk) {
      console.log("[AUTH] AUTH_STATE_CHANGED", "GUEST");
    } else {
      useUserStore.getState().setAuthState('UNAUTHENTICATED');
      console.log("[AUTH] AUTH_STATE_CHANGED", "UNAUTHENTICATED");
    }
    console.log("[AUTH] AUTH_BOOTSTRAP_END");
    return false;
  }

  async refresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    
    this.refreshPromise = (async () => {
      console.log("[AUTH] AUTH_REFRESH_START");
      try {
        const response = await fetchApi('/auth/refresh', { method: 'POST' });
        if (response.success) {
          console.log("[AUTH] AUTH_REFRESH_SUCCESS");
          return true;
        }
        console.log("[AUTH] AUTH_REFRESH_FAILED");
        return false;
      } catch (e) {
        console.log("[AUTH] AUTH_REFRESH_FAILED");
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  async initGuest(): Promise<boolean> {
    if (useSystemStore.getState().isMaintenanceMode) {
      console.log("[AUTH] GUEST_INIT_SKIPPED (Maintenance Mode)");
      return false;
    }

    const { guestQuota, authState } = useUserStore.getState();
    if (authState === 'GUEST' || (guestQuota && new Date(guestQuota.expires_at).getTime() > Date.now())) {
      console.log("[AUTH] GUEST_INIT_SKIPPED (Already Initialized)");
      useUserStore.getState().setAuthState('GUEST');
      return true;
    }

    if (this.guestPromise) return this.guestPromise;

    this.guestPromise = (async () => {
      console.log("[AUTH] AUTH_GUEST_START");
      try {
        const response = await fetchApi('/guest/init', { method: 'POST' });
        if (response && response.access_token) {
          useUserStore.getState().setGuestSuccess({
            executions_used: response.executions_used,
            executions_max: response.executions_max,
            expires_at: response.expires_at
          });
          console.log("[AUTH] AUTH_GUEST_DONE");
          return true;
        }
        return false;
      } catch (error) {
        console.error("Failed to init guest:", error);
        return false;
      } finally {
        this.guestPromise = null;
      }
    })();
    return this.guestPromise;
  }

  async logout(): Promise<void> {
    console.log("[AUTH] AUTH_LOGOUT");
    
    // 1. Stop promises
    this.bootstrapPromise = null;
    this.refreshPromise = null;
    this.guestPromise = null;

    // 2. Clear state
    useUserStore.getState().clearAuth();
    
    // 3. Cancel queries
    queryClient.cancelQueries();
    queryClient.clear();

    // 4. API Logout
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {}

    // 5. Navigate
    window.location.href = '/login';
  }
  
  destroy() {
    console.log("[AUTH] AUTH_CONTROLLER_DESTROY");
    this.bootstrapPromise = null;
    this.refreshPromise = null;
    this.guestPromise = null;
  }
}

export const authController = new AuthController();
