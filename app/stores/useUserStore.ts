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

export type AuthState = 'UNKNOWN' | 'BOOTSTRAPPING' | 'AUTHENTICATED' | 'GUEST' | 'UNAUTHENTICATED';

interface UserState {
  user: User | null;
  permissions: string[];
  authState: AuthState;
  
  guestQuota: GuestQuota | null;
  showGuestConversionModal: boolean;
  setShowGuestConversionModal: (show: boolean) => void;
  
  setAuthState: (state: AuthState) => void;
  setAuthSuccess: (user: User, permissions: string[]) => void;
  setGuestSuccess: (quota: GuestQuota) => void;
  clearAuth: () => void;
  incrementGuestQuota: () => void;
  
  updateProfile: (data: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      authState: 'UNKNOWN',
      guestQuota: null,
      showGuestConversionModal: false,

      setShowGuestConversionModal: (show) => set({ showGuestConversionModal: show }),
      
      setAuthState: (state) => set({ authState: state }),
      
      setAuthSuccess: (user, permissions) => set({ 
        user, 
        permissions, 
        authState: 'AUTHENTICATED' 
      }),
      
      setGuestSuccess: (quota) => set({ 
        guestQuota: quota,
        authState: 'GUEST'
      }),
      
      clearAuth: () => set({ 
        user: null, 
        permissions: [], 
        authState: 'UNAUTHENTICATED',
        guestQuota: null
      }),
      
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
