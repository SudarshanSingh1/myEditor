import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  size: number;
  hash: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FileVersionWithContent extends FileVersion {
  content: string;
}

interface VersionStore {
  versions: Record<string, FileVersion[]>; // Keyed by file_id
  selectedVersion: FileVersionWithContent | null;
  isLoading: boolean;
  error: string | null;
  
  fetchVersions: (fileId: string) => Promise<void>;
  fetchVersionContent: (fileId: string, versionNumber: number) => Promise<void>;
  clearSelectedVersion: () => void;
  restoreVersion: (fileId: string, versionNumber: number) => Promise<boolean>;
  deleteVersion: (fileId: string, versionNumber: number) => Promise<void>;
}

export const useVersionStore = create<VersionStore>((set, _get) => ({
  versions: {},
  selectedVersion: null,
  isLoading: false,
  error: null,

  fetchVersions: async (fileId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchApi(`/workspace/files/${fileId}/versions`);
      set((state) => ({
        versions: {
          ...state.versions,
          [fileId]: response.data,
        },
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch versions', isLoading: false });
    }
  },

  fetchVersionContent: async (fileId: string, versionNumber: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchApi(`/workspace/files/${fileId}/versions/${versionNumber}`);
      set({ selectedVersion: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch version content', isLoading: false });
    }
  },

  clearSelectedVersion: () => {
    set({ selectedVersion: null });
  },

  restoreVersion: async (fileId: string, versionNumber: number) => {
    set({ isLoading: true, error: null });
    try {
      await fetchApi(`/workspace/files/${fileId}/restore/${versionNumber}`, { method: 'POST' });
      set({ selectedVersion: null, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to restore version', isLoading: false });
      return false;
    }
  },

  deleteVersion: async (fileId: string, versionNumber: number) => {
    try {
      await fetchApi(`/workspace/files/${fileId}/versions/${versionNumber}`, { method: 'DELETE' });
      set((state) => ({
        versions: {
          ...state.versions,
          [fileId]: state.versions[fileId]?.filter(v => v.version_number !== versionNumber) || [],
        }
      }));
    } catch (err: any) {
      console.error('Failed to delete version', err);
    }
  }
}));
