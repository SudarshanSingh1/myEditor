import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export interface GitHubStatus {
  connected: boolean;
  github_username: string | null;
  avatar_url: string | null;
  token_expired?: boolean;
}

interface GitHubStore {
  status: GitHubStatus | null;
  isLoading: boolean;
  fetchStatus: () => Promise<void>;
  reset: () => void;
}

export const useGitHubStore = create<GitHubStore>((set) => ({
  status: null,
  isLoading: false,

  fetchStatus: async () => {
    set({ isLoading: true });
    try {
      const res = await fetchApi('/github/status', { method: 'GET' });
      if (res?.data) {
        set({ status: res.data as GitHubStatus, isLoading: false });
      } else {
        set({ status: { connected: false, github_username: null, avatar_url: null }, isLoading: false });
      }
    } catch {
      set({ status: { connected: false, github_username: null, avatar_url: null }, isLoading: false });
    }
  },

  reset: () => set({ status: null, isLoading: false }),
}));
