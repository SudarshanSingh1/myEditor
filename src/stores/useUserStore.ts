import { create } from 'zustand';
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

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set) => {
  return {
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
        }
      } catch {
        set({ user: null, isAuthenticated: false });
      } finally {
        set({ isLoading: false });
      }
    },
    
    login: (user) => set({ user, isAuthenticated: true }),
    
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
  };
});
