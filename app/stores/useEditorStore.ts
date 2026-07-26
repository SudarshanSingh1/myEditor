import { create } from 'zustand';

import { persist } from 'zustand/middleware';

export interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'system' | 'dracula' | 'monokai' | 'github-dark' | 'night-owl';
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  autoSave: 'on' | 'off';
  autoSaveDelay: number; // in seconds
  terminalPrompt?: string;
  syntaxValidation: boolean;
}

export interface TabFile {
  id: string;
  name: string;
  path?: string;
  language?: string | null;
  isPreview?: boolean;
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
  markers: Record<string, any[]>; // fileId -> monaco.editor.IMarkerData[]
  settings: EditorSettings;

  // Actions
  setProject: (projectId: string) => void;
  setProjectLanguage: (language: string) => void;
  openTab: (file: Omit<TabFile, 'isPreview'>, isPreview?: boolean) => void;
  pinTab: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  updateTab: (fileId: string, updates: Partial<TabFile>) => void;
  setActiveFile: (fileId: string | null) => void;
  
  setFileContent: (fileId: string, content: string, isDirty: boolean) => void;
  clearDirtyState: (fileId: string) => void;
  
  setViewState: (fileId: string, viewState: ViewState) => void;
  setMarkers: (fileId: string, markers: any[]) => void;
  clearMarkers: (fileId: string) => void;
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
  terminalPrompt: '',
  syntaxValidation: true,
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
      markers: {},
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
          markers: {},
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
        markers: {},
      }),

      openTab: (file, isPreview = false) =>
        set((state) => {
          const existsIndex = state.tabs.findIndex((t) => t.id === file.id);
          
          if (existsIndex >= 0) {
            // If it already exists, and we're opening it NOT as preview, pin it.
            if (!isPreview && state.tabs[existsIndex].isPreview) {
              const newTabs = [...state.tabs];
              newTabs[existsIndex] = { ...newTabs[existsIndex], isPreview: false };
              return { tabs: newTabs, activeFileId: file.id };
            }
            return { activeFileId: file.id };
          }

          let newTabs = [...state.tabs];
          
          if (isPreview) {
            // Find existing preview tab
            const existingPreviewIndex = newTabs.findIndex((t) => t.isPreview);
            if (existingPreviewIndex >= 0) {
              const previewTabId = newTabs[existingPreviewIndex].id;
              // Only replace if it's not dirty
              if (!state.dirtyFiles[previewTabId]) {
                newTabs[existingPreviewIndex] = { ...file, isPreview: true };
                
                // Cleanup old preview tab's state
                const newDirtyFiles = { ...state.dirtyFiles };
                const newLocalContents = { ...state.localContents };
                const newViewStates = { ...state.viewStates };
                const newMarkers = { ...state.markers };
                delete newDirtyFiles[previewTabId];
                delete newLocalContents[previewTabId];
                delete newViewStates[previewTabId];
                delete newMarkers[previewTabId];
                
                return {
                  tabs: newTabs,
                  activeFileId: file.id,
                  dirtyFiles: newDirtyFiles,
                  localContents: newLocalContents,
                  viewStates: newViewStates,
                  markers: newMarkers,
                };
              }
            }
          }
          
          newTabs.push({ ...file, isPreview });
          return {
            tabs: newTabs,
            activeFileId: file.id,
          };
        }),

      pinTab: (fileId) => 
        set((state) => {
          const tabIndex = state.tabs.findIndex(t => t.id === fileId);
          if (tabIndex === -1 || !state.tabs[tabIndex].isPreview) return state;
          
          const newTabs = [...state.tabs];
          newTabs[tabIndex] = { ...newTabs[tabIndex], isPreview: false };
          return { tabs: newTabs };
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
          const newMarkers = { ...state.markers };
          
          delete newDirtyFiles[fileId];
          delete newLocalContents[fileId];
          delete newViewStates[fileId];
          delete newMarkers[fileId];

          return {
            tabs: newTabs,
            activeFileId: newActiveId,
            dirtyFiles: newDirtyFiles,
            localContents: newLocalContents,
            viewStates: newViewStates,
            markers: newMarkers,
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

      setMarkers: (fileId, markers) => set((state) => ({
        markers: { ...state.markers, [fileId]: markers }
      })),

      clearMarkers: (fileId) => set((state) => {
        const newMarkers = { ...state.markers };
        delete newMarkers[fileId];
        return { markers: newMarkers };
      }),

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
        localContents: Object.fromEntries(
          Object.entries(state.localContents).filter(([k]) => k.startsWith('guest-'))
        ),
      }),
    }
  )
);
