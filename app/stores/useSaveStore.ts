import { create } from 'zustand';
import { workspaceApi } from '../lib/api/workspace';
import { useEditorStore } from './useEditorStore';
import { useNotificationStore } from './useNotificationStore';

type SaveStatus = 'saved' | 'saving' | 'failed' | 'conflicted' | 'modified';

// Module-level map keeps timeout IDs outside Zustand state so they are never
// serialized by the persist middleware (setTimeout returns a platform-opaque ID).
const autoSaveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

interface SaveState {
  fileVersions: Record<string, number>;
  fileStatuses: Record<string, SaveStatus>;
  lastSavedAt: Record<string, number>;
  conflictedFiles: Set<string>;

  setFileVersion: (fileId: string, version: number) => void;
  setFileStatus: (fileId: string, status: SaveStatus) => void;

  saveFile: (fileId: string, content: string) => Promise<boolean>;
  saveAll: () => Promise<void>;

  scheduleAutoSave: (fileId: string, content: string, delayMs: number) => void;
  clearAutoSave: (fileId: string) => void;
  retryFailedSaves: () => Promise<void>;
  reset: () => void;
}

export const useSaveStore = create<SaveState>((set, get) => ({
  fileVersions: {},
  fileStatuses: {},
  lastSavedAt: {},
  conflictedFiles: new Set<string>(),

  setFileVersion: (fileId, version) => set((state) => ({
    fileVersions: { ...state.fileVersions, [fileId]: version }
  })),

  setFileStatus: (fileId, status) => set((state) => ({
    fileStatuses: { ...state.fileStatuses, [fileId]: status }
  })),

  reset: () => {
    // Clear any pending timeouts on reset
    autoSaveTimeouts.forEach(clearTimeout);
    autoSaveTimeouts.clear();
    set({ fileVersions: {}, fileStatuses: {}, lastSavedAt: {}, conflictedFiles: new Set<string>() });
  },

  saveFile: async (fileId: string, content: string) => {
    const { fileVersions, setFileStatus, setFileVersion, clearAutoSave } = get();

    // Clear any pending autosave for this file since we are saving it right now
    clearAutoSave(fileId);

    // Default to version 1 if we don't have it tracked yet
    const expected_version = fileVersions[fileId] || 1;

    setFileStatus(fileId, 'saving');

    try {
      const response = await workspaceApi.saveFile({
        id: fileId,
        content,
        expected_version
      });

      setFileVersion(fileId, response.version);
      setFileStatus(fileId, 'saved');
      set((state) => ({ lastSavedAt: { ...state.lastSavedAt, [fileId]: Date.now() } }));

      // Tell the Editor Store it is no longer dirty locally
      useEditorStore.getState().clearDirtyState(fileId);

      return true;
    } catch (error: any) {
      if (error?.status === 409) {
        // Extract the server's authoritative version from the error response body.
        // Updating fileVersions unblocks future saves — they will use this version.
        const serverVersion: number | undefined = error?.data?.current_version;
        if (serverVersion !== undefined) {
          set((state) => ({
            fileVersions: { ...state.fileVersions, [fileId]: serverVersion },
          }));
        }
        set((state) => ({
          conflictedFiles: new Set([...state.conflictedFiles, fileId]),
        }));
        setFileStatus(fileId, 'conflicted');
        useNotificationStore.getState().addToast({
          type: 'warning',
          title: 'Save conflict detected',
          message: 'Your next save will overwrite the server version.',
        });
      } else {
        setFileStatus(fileId, 'failed');
      }
      return false;
    }
  },

  saveAll: async () => {
    const dirtyFiles = useEditorStore.getState().dirtyFiles;
    const localContents = useEditorStore.getState().localContents;
    const { clearAutoSave } = get();

    const filesToSave = Object.keys(dirtyFiles)
      .filter(id => dirtyFiles[id])
      .map(id => {
        clearAutoSave(id);
        return {
          id,
          content: localContents[id] || '',
          expected_version: get().fileVersions[id] || 1
        };
      });

    if (filesToSave.length === 0) return;

    // Mark all as saving
    filesToSave.forEach(f => get().setFileStatus(f.id, 'saving'));

    try {
      const response = await workspaceApi.saveBatch({ files: filesToSave });

      const now = Date.now();
      response.forEach(file => {
        get().setFileVersion(file.id, file.version);
        get().setFileStatus(file.id, 'saved');
        useEditorStore.getState().clearDirtyState(file.id);
      });

      set((state) => {
        const newLastSavedAt = { ...state.lastSavedAt };
        response.forEach(file => {
          newLastSavedAt[file.id] = now;
        });
        return { lastSavedAt: newLastSavedAt };
      });

    } catch {
      filesToSave.forEach(f => get().setFileStatus(f.id, 'failed'));
    }
  },

  scheduleAutoSave: (fileId, content, delayMs) => {
    const { setFileStatus } = get();

    // Set status to modified if not already saving or failed
    const currentStatus = get().fileStatuses[fileId];
    if (currentStatus !== 'saving' && currentStatus !== 'failed') {
      setFileStatus(fileId, 'modified');
    }

    // Clear existing timer for this file before scheduling a new one
    const existing = autoSaveTimeouts.get(fileId);
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    const timeoutId = setTimeout(() => {
      autoSaveTimeouts.delete(fileId);
      get().saveFile(fileId, content);
    }, delayMs);

    autoSaveTimeouts.set(fileId, timeoutId);
  },

  clearAutoSave: (fileId) => {
    const existing = autoSaveTimeouts.get(fileId);
    if (existing !== undefined) {
      clearTimeout(existing);
      autoSaveTimeouts.delete(fileId);
    }
  },

  retryFailedSaves: async () => {
    const { fileStatuses, saveFile } = get();
    const { dirtyFiles, localContents } = useEditorStore.getState();

    // Find all dirty files that have a 'failed' status
    const failedFiles = Object.keys(fileStatuses).filter(
      id => fileStatuses[id] === 'failed' && dirtyFiles[id]
    );

    for (const fileId of failedFiles) {
      const content = localContents[fileId];
      if (content !== undefined) {
        await saveFile(fileId, content);
      }
    }
  }
}));
