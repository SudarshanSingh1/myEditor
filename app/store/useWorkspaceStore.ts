import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode } from '../lib/api/workspace';

interface WorkspaceState {
  expandedFolders: Set<string>;
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
      expandedFolders: new Set<string>(),
      activeFileId: null,
      activeFolderId: null,
      openedFiles: [],

      toggleFolder: (folderId) =>
        set((state) => {
          const newSet = new Set(state.expandedFolders);
          if (newSet.has(folderId)) {
            newSet.delete(folderId);
          } else {
            newSet.add(folderId);
          }
          return { expandedFolders: newSet };
        }),

      expandFolder: (folderId) =>
        set((state) => {
          const newSet = new Set(state.expandedFolders);
          newSet.add(folderId);
          return { expandedFolders: newSet };
        }),

      collapseFolder: (folderId) =>
        set((state) => {
          const newSet = new Set(state.expandedFolders);
          newSet.delete(folderId);
          return { expandedFolders: newSet };
        }),

      collapseAll: () => set({ expandedFolders: new Set<string>() }),

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
        expandedFolders: new Set<string>(),
        activeFileId: null,
        activeFolderId: null,
        openedFiles: [],
      }),
    }),
    {
      name: 'hamara-workspace-storage',
      partialize: (state) => ({
        // We need to convert Set to Array for JSON serialization
        expandedFoldersArray: Array.from(state.expandedFolders),
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        expandedFolders: new Set(persistedState?.expandedFoldersArray || []),
      }),
    }
  )
);
