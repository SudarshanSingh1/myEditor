import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchApi } from '../lib/api';
import { useSystemStore } from './useSystemStore';
import { queryClient } from '../lib/queryClient';

// Share the exact same promise for concurrent callers
let _authPromise: Promise<void> | null = null;
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
  setAuthInvalid: (invalid: boolean) => void;
  checkAuth: () => Promise<void>;
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
      setAuthInvalid: (invalid) => set({ authInvalid: invalid }),
      
      checkAuth: async () => {
        if (_authPromise) return _authPromise;
        if (get().isLoggingOut || get().authInvalid) return;

        const executeAuth = async () => {
          const { checkStatus, hasChecked } = useSystemStore.getState();
          if (!hasChecked) {
            await checkStatus();
          }

          set({ isLoading: true });
          try {
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
              set({ user: userWithPerms, permissions: perms, isAuthenticated: true });
            } else {
              set({ user: null, permissions: [], isAuthenticated: false });
              // If not auth, we initialize guest
              if (!useSystemStore.getState().isMaintenanceMode) {
                await get().initGuest();
              }
            }
          } catch {
            set({ user: null, permissions: [], isAuthenticated: false });
            if (!useSystemStore.getState().isMaintenanceMode) {
              await get().initGuest();
            }
          } finally {
            set({ isLoading: false });
          }
        };

        _authPromise = executeAuth();
        try {
          await _authPromise;
        } finally {
          _authPromise = null;
        }
      },
      
      initGuest: async () => {
        if (useSystemStore.getState().isMaintenanceMode) {
          return;
        }

        // If we already have a quota that isn't expired, don't re-init
        const quota = get().guestQuota;
        if (quota && new Date(quota.expires_at).getTime() > Date.now()) {
          return;
        }

        if (_guestPromise) return _guestPromise;

        _guestPromise = (async () => {
          try {
            const response = await fetchApi('/guest/init', { method: 'POST' });
            if (response && response.access_token) {
              set({ 
                guestQuota: {
                  executions_used: response.executions_used,
                  executions_max: response.executions_max,
                  expires_at: response.expires_at
                }
              });
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
