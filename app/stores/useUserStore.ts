import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchApi } from '../lib/api';
import { useSystemStore } from './useSystemStore';
import { queryClient } from '../lib/queryClient';

// Share the exact same promise for concurrent callers
let _bootstrapPromise: Promise<boolean> | null = null;
let _guestPromise: Promise<void> | null = null;

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  must_change_password?: boolean;
  bio?: string;
  timezone?: string;
  theme_preference?: string;
  totp_enabled?: boolean;
  effective_permissions?: string[];
}

interface GuestQuota {
  executions_used: number;
  executions_max: number;
  expires_at: string;
}

interface UserState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  authInvalid: boolean;
  authBootstrapComplete: boolean;
  guestInitialized: boolean;
  setAuthInvalid: (invalid: boolean) => void;
  bootstrapAuth: (force?: boolean) => Promise<boolean>;
  initGuest: () => Promise<void>;
  incrementGuestQuota: () => void;
  guestQuota: GuestQuota | null;
  showGuestConversionModal: boolean;
  setShowGuestConversionModal: (show: boolean) => void;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: true,
      isLoggingOut: false,
      authInvalid: false,
      authBootstrapComplete: false,
      guestInitialized: false,
      setAuthInvalid: (invalid) => set({ authInvalid: invalid }),
      
      bootstrapAuth: async (force = false) => {
        if (_bootstrapPromise && !force) return _bootstrapPromise;
        if (get().isLoggingOut || get().authInvalid) {
          console.log("[AUTH] AUTH_ME_SKIPPED (authInvalid or loggingOut)");
          return false;
        }

        if (get().authBootstrapComplete && !force) {
          console.log("[AUTH] AUTH_ME_SKIPPED (authBootstrapComplete)");
          return get().isAuthenticated;
        }

        const executeAuth = async () => {
          console.log("[AUTH] AUTH_BOOTSTRAP_START");
          const { checkStatus, hasChecked } = useSystemStore.getState();
          if (!hasChecked) {
            await checkStatus();
          }

          set({ isLoading: true });
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
              set({ user: userWithPerms, permissions: perms, isAuthenticated: true, authBootstrapComplete: true });
              console.log("[AUTH] AUTH_BOOTSTRAP_END (Success)");
              return true;
            } else {
              // If not auth, we initialize guest
              if (!useSystemStore.getState().isMaintenanceMode) {
                await get().initGuest();
              }
              set({ user: null, permissions: [], isAuthenticated: false, authBootstrapComplete: true });
              console.log("[AUTH] AUTH_BOOTSTRAP_END (Failure)");
              return false;
            }
          } catch {
            if (!useSystemStore.getState().isMaintenanceMode) {
              await get().initGuest();
            }
            set({ user: null, permissions: [], isAuthenticated: false, authBootstrapComplete: true });
            console.log("[AUTH] AUTH_BOOTSTRAP_END (Exception)");
            return false;
          } finally {
            set({ isLoading: false });
          }
        };

        _bootstrapPromise = executeAuth();
        try {
          return await _bootstrapPromise;
        } finally {
          _bootstrapPromise = null;
        }
      },
      
      initGuest: async () => {
        if (useSystemStore.getState().isMaintenanceMode) {
          console.log("[AUTH] GUEST_INIT_SKIPPED (Maintenance Mode)");
          return;
        }

        if (get().guestInitialized) {
          console.log("[AUTH] GUEST_INIT_SKIPPED (Already Initialized)");
          return;
        }

        // If we already have a quota that isn't expired, don't re-init
        const quota = get().guestQuota;
        if (quota && new Date(quota.expires_at).getTime() > Date.now()) {
          console.log("[AUTH] GUEST_INIT_SKIPPED (Quota exists)");
          set({ guestInitialized: true });
          return;
        }

        if (_guestPromise) return _guestPromise;

        _guestPromise = (async () => {
          console.log("[AUTH] GUEST_INIT_START");
          try {
            const response = await fetchApi('/guest/init', { method: 'POST' });
            if (response && response.access_token) {
              set({ 
                guestQuota: {
                  executions_used: response.executions_used,
                  executions_max: response.executions_max,
                  expires_at: response.expires_at
                },
                guestInitialized: true
              });
              console.log("[AUTH] GUEST_INIT_DONE");
            }
          } catch (error) {
            console.error("Failed to init guest:", error);
          } finally {
            _guestPromise = null;
          }
        })();

        return _guestPromise;
      },
      
      incrementGuestQuota: () => {
        const quota = get().guestQuota;
        if (!quota) return;
        const newUsed = quota.executions_used + 1;
        set({ guestQuota: { ...quota, executions_used: newUsed } });
      },

      guestQuota: null,
      showGuestConversionModal: false,
      setShowGuestConversionModal: (show: boolean) => {
        if (show) {
          const quota = get().guestQuota;
          if (quota) set({ guestQuota: { ...quota, executions_used: quota.executions_max } });
        }
        set({ showGuestConversionModal: show });
      },
      
      login: async (user) => {
        set({ authInvalid: false });
        let perms: string[] = user.effective_permissions || [];
        try {
          const permResp = await fetchApi('/rbac/my-permissions');
          if (permResp && permResp.permissions) {
            perms = permResp.permissions;
          }
        } catch (e) {
          console.error("Failed to fetch permissions on login", e);
        }
        const userWithPerms = { ...user, effective_permissions: perms };
        set({ user: userWithPerms, permissions: perms, isAuthenticated: true, guestQuota: null });
      },
      
      logout: async () => {
        // Cancel active queries and clear stale data immediately
        queryClient.cancelQueries();
        queryClient.clear();
        
        // Sync reset state so UI navigates in one render cycle
        set({ 
          user: null, 
          permissions: [], 
          isAuthenticated: false, 
          isLoggingOut: true,
          guestQuota: null
        });
        
        try {
          await fetchApi('/auth/logout', { method: 'POST' });
        } catch (error) {
          console.error("Logout failed:", error);
        } finally {
          set({ isLoggingOut: false });
        }
      },
      
      updateProfile: (data) => set((state) => ({ 
        user: state.user ? { ...state.user, ...data } : null 
      })),
    }),
    {
      name: 'hamara-user-storage',
      partialize: (state) => ({
        guestQuota: state.guestQuota,
      }),
    }
  )
);
