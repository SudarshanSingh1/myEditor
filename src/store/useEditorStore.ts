import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode } from '../lib/api/workspace';

export interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'system';
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  autoSave: 'on' | 'off';
  autoSaveDelay: number; // in seconds
}

export interface TabFile {
  id: string;
  name: string;
  path?: string;
  language?: string | null;
}

export interface ViewState {
  cursorPosition: { lineNumber: number; column: number } | null;
  scrollPosition: { scrollTop: number; scrollLeft: number } | null;
}

interface EditorState {
  projectId: string | null;
  projectLanguage: string | null;
  tabs: TabFile[];
  activeFileId: string | null;
  dirtyFiles: Record<string, boolean>;
  localContents: Record<string, string>; // fileId -> string
  viewStates: Record<string, ViewState>; // fileId -> ViewState
  settings: EditorSettings;

  // Actions
  setProject: (projectId: string) => void;
  setProjectLanguage: (language: string) => void;
  openTab: (file: TabFile) => void;
  closeTab: (fileId: string) => void;
  updateTab: (fileId: string, updates: Partial<TabFile>) => void;
  setActiveFile: (fileId: string | null) => void;
  
  setFileContent: (fileId: string, content: string, isDirty: boolean) => void;
  clearDirtyState: (fileId: string) => void;
  
  setViewState: (fileId: string, viewState: ViewState) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  reset: () => void;
}

const defaultSettings: EditorSettings = {
  theme: 'system',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineNumbers: 'on',
  autoClosingBrackets: 'languageDefined',
  renderWhitespace: 'none',
  autoSave: 'on',
  autoSaveDelay: 3,
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      projectId: null,
      projectLanguage: null,
      tabs: [],
      activeFileId: null,
      dirtyFiles: {},
      localContents: {},
      viewStates: {},
      settings: defaultSettings,

      setProject: (projectId) => {
        if (useEditorStore.getState().projectId === projectId) return;
        set({
          projectId,
          projectLanguage: null,
          tabs: [],
          activeFileId: null,
          dirtyFiles: {},
          localContents: {},
          viewStates: {},
        });
      },
      setProjectLanguage: (projectLanguage) => set({ projectLanguage }),
      reset: () => set({
        projectId: null,
        projectLanguage: null,
        tabs: [],
        activeFileId: null,
        dirtyFiles: {},
        localContents: {},
        viewStates: {},
      }),

      openTab: (file) =>
        set((state) => {
          const exists = state.tabs.find((t) => t.id === file.id);
          if (exists) {
            return { activeFileId: file.id };
          }
          return {
            tabs: [...state.tabs, file],
            activeFileId: file.id,
          };
        }),

      closeTab: (fileId) =>
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== fileId);
          let newActiveId = state.activeFileId;

          if (state.activeFileId === fileId) {
            const index = state.tabs.findIndex((t) => t.id === fileId);
            if (newTabs.length > 0) {
              const nextIndex = Math.min(index, newTabs.length - 1);
              newActiveId = newTabs[nextIndex].id;
            } else {
              newActiveId = null;
            }
          }

          const newDirtyFiles = { ...state.dirtyFiles };
          const newLocalContents = { ...state.localContents };
          const newViewStates = { ...state.viewStates };
          
          delete newDirtyFiles[fileId];
          delete newLocalContents[fileId];
          delete newViewStates[fileId];

          return {
            tabs: newTabs,
            activeFileId: newActiveId,
            dirtyFiles: newDirtyFiles,
            localContents: newLocalContents,
            viewStates: newViewStates,
          };
        }),

      updateTab: (fileId, updates) =>
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === fileId ? { ...t, ...updates } : t)),
        })),

      setActiveFile: (fileId) => set({ activeFileId: fileId }),

      setFileContent: (fileId, content, isDirty) =>
        set((state) => ({
          localContents: { ...state.localContents, [fileId]: content },
          dirtyFiles: { ...state.dirtyFiles, [fileId]: isDirty },
        })),

      clearDirtyState: (fileId) =>
        set((state) => ({
          dirtyFiles: { ...state.dirtyFiles, [fileId]: false },
        })),

      setViewState: (fileId, viewState) =>
        set((state) => ({
          viewStates: { ...state.viewStates, [fileId]: viewState },
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'hamara-editor-storage',
      // Persist only lightweight metadata, not file contents.
      // localContents is intentionally excluded: it can contain MBs of source code,
      // and writing it to localStorage on every keystroke is both a privacy risk
      // and a performance bottleneck. File content is re-fetched from the server on open.
      partialize: (state) => ({
        projectId: state.projectId,
        tabs: state.tabs,
        activeFileId: state.activeFileId,
        viewStates: state.viewStates,
        settings: state.settings,
      }),
    }
  )
);
