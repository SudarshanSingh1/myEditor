import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode } from '../lib/api/workspace';

interface WorkspaceState {
  expandedFolders: Record<string, boolean>;
  activeFileId: string | null;
  activeFolderId: string | null;
  openedFiles: FileNode[];

  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  collapseAll: () => void;
  
  openFile: (file: FileNode) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  setActiveFolder: (folderId: string | null) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      expandedFolders: {},
      activeFileId: null,
      activeFolderId: null,
      openedFiles: [],

      toggleFolder: (folderId) =>
        set((state) => {
          const newMap = { ...state.expandedFolders };
          if (newMap[folderId]) {
            delete newMap[folderId];
          } else {
            newMap[folderId] = true;
          }
          return { expandedFolders: newMap };
        }),

      expandFolder: (folderId) =>
        set((state) => {
          if (state.expandedFolders[folderId]) return state;
          return { expandedFolders: { ...state.expandedFolders, [folderId]: true } };
        }),

      collapseFolder: (folderId) =>
        set((state) => {
          if (!state.expandedFolders[folderId]) return state;
          const newMap = { ...state.expandedFolders };
          delete newMap[folderId];
          return { expandedFolders: newMap };
        }),

      collapseAll: () => set({ expandedFolders: {} }),

      openFile: (file) =>
        set((state) => {
          const exists = state.openedFiles.find((f) => f.id === file.id);
          if (exists) {
            return { activeFileId: file.id };
          }
          return {
            openedFiles: [...state.openedFiles, file],
            activeFileId: file.id,
          };
        }),

      closeFile: (fileId) =>
        set((state) => {
          const newOpened = state.openedFiles.filter((f) => f.id !== fileId);
          let newActive = state.activeFileId;
          if (state.activeFileId === fileId) {
            newActive = newOpened.length > 0 ? newOpened[newOpened.length - 1].id : null;
          }
          return {
            openedFiles: newOpened,
            activeFileId: newActive,
          };
        }),

      setActiveFile: (fileId) => set({ activeFileId: fileId }),
      setActiveFolder: (folderId) => set({ activeFolderId: folderId }),
      
      reset: () => set({
        expandedFolders: {},
        activeFileId: null,
        activeFolderId: null,
        openedFiles: [],
      }),
    }),
    {
      name: 'hamara-workspace-storage',
      partialize: (state) => ({
        expandedFolders: state.expandedFolders,
      }),
    }
  )
);
