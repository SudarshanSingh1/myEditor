import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchApi } from '../lib/api';

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
}

interface GuestQuota {
  executions_used: number;
  executions_max: number;
  expires_at: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  initGuest: () => Promise<void>;
  incrementGuestQuota: () => void;
  guestQuota: GuestQuota | null;
  showGuestConversionModal: boolean;
  setShowGuestConversionModal: (show: boolean) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await fetchApi('/auth/me');
          if (response.success && response.data) {
            set({ user: response.data, isAuthenticated: true });
          } else {
            set({ user: null, isAuthenticated: false });
            // If not auth, we initialize guest
            await get().initGuest();
          }
        } catch {
          set({ user: null, isAuthenticated: false });
          await get().initGuest();
        } finally {
          set({ isLoading: false });
        }
      },
      
      initGuest: async () => {
        // If we already have a quota that isn't expired, don't re-init
        const quota = get().guestQuota;
        if (quota && new Date(quota.expires_at).getTime() > Date.now()) {
          return;
        }

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
        }
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
      
      login: (user) => set({ user, isAuthenticated: true, guestQuota: null }),
      
      logout: async () => {
        try {
          await fetchApi('/auth/logout', { method: 'POST' });
        } catch (error) {
          console.error("Logout failed:", error);
        } finally {
          set({ user: null, isAuthenticated: false });
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
