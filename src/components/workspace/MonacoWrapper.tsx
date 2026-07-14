import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { DiffEditor, useMonaco } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import { useEditorStore } from '../../store/useEditorStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useSaveStore } from '../../store/useSaveStore';
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useStatusBarStore } from '../../store/useStatusBarStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useVersionStore } from '../../store/useVersionStore';
import { RotateCcw } from 'lucide-react';

interface MonacoWrapperProps {
  fileId: string;
  filename: string;
  initialContent: string;
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  html: 'html',
  css: 'css',
  scss: 'scss',
  md: 'markdown',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  sql: 'sql',
  sh: 'shell',
  txt: 'plaintext',
};

function getLanguageFromFilename(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return 'plaintext';
  const ext = parts[parts.length - 1].toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

export const MonacoWrapper: React.FC<MonacoWrapperProps> = ({ fileId, filename, initialContent }) => {
  const { 
    settings, 
    localContents, 
    setFileContent, 
    clearDirtyState,
    viewStates,
    setViewState
  } = useEditorStore();
  
  const appTheme = useThemeStore((state) => state.theme);
  const { confirm } = useConfirm();
  const monaco = useMonaco();
  const { selectedVersion, restoreVersion } = useVersionStore();
  const { addToast } = useNotificationStore();

  // Keep IDisposable refs so we can call .dispose() on unmount to prevent listener leaks.
  const listenerDisposablesRef = useRef<MonacoEditor.IDisposable[]>([]);
  
  const [computedTheme, setComputedTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark');

  // Compute theme
  useEffect(() => {
    let resolvedTheme = settings.theme;
    if (resolvedTheme === 'system') {
      if (appTheme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light';
      } else {
        resolvedTheme = appTheme === 'dark' ? 'vs-dark' : 'vs-light';
      }
    }
    setComputedTheme(resolvedTheme as 'vs-dark' | 'vs-light');
  }, [settings.theme, appTheme]);

  // Cleanup Monaco event listeners when fileId changes or component unmounts
  useEffect(() => {
    return () => {
      listenerDisposablesRef.current.forEach(d => d.dispose());
      listenerDisposablesRef.current = [];
    };
  }, [fileId]);

  // The actual text model content logic
  const content = localContents[fileId] !== undefined ? localContents[fileId] : initialContent;
  const language = getLanguageFromFilename(filename);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    // Compare against server-persisted content (last saved version), not just the initial prop.
    // This ensures isDirty is correct after save cycles.
    const fileVersions = useSaveStore.getState().fileVersions;
    const hasEverSaved = fileId in fileVersions;
    // If we've never tracked a version (new file), compare against initialContent.
    // After at least one save, the source of truth is the store's content tracking.
    const isDirty = hasEverSaved ? true : value !== initialContent;
    setFileContent(fileId, value, isDirty);
    
    // Automatically pin the tab if the user starts modifying it
    if (isDirty) {
      useEditorStore.getState().pinTab(fileId);
    }
    
    if (isDirty && settings.autoSave === 'on') {
      useSaveStore.getState().scheduleAutoSave(fileId, value, settings.autoSaveDelay * 1000);
    } else if (!isDirty) {
      useSaveStore.getState().clearAutoSave(fileId);
    }
  }, [fileId, initialContent, settings.autoSave, settings.autoSaveDelay, setFileContent]);

  const handleEditorMount = useCallback((
    editor: MonacoEditor.editor.IStandaloneCodeEditor,
    monacoInstance: Monaco
  ) => {
    // Dispose old listeners from any previous mount (e.g. if onMount is called again)
    listenerDisposablesRef.current.forEach(d => d.dispose());
    listenerDisposablesRef.current = [];

    // Force layout and font remeasurement to fix caret offset bugs
    editor.layout();
    document.fonts.ready.then(() => {
      monacoInstance.editor.remeasureFonts();
    });

    // Focus editor on mount
    editor.focus();

    // Ensure cursor is placed correctly
    editor.setPosition({ lineNumber: 1, column: 1 });

    // Restore View State (Cursor/Scroll)
    const viewState = viewStates[fileId];
    if (viewState) {
      if (viewState.cursorPosition) {
        editor.setPosition(viewState.cursorPosition);
      }
      if (viewState.scrollPosition) {
        editor.setScrollTop(viewState.scrollPosition.scrollTop);
        editor.setScrollLeft(viewState.scrollPosition.scrollLeft);
      }
    }

    // Capture cursor/scroll changes — store IDisposables for cleanup
    const d1 = editor.onDidChangeCursorPosition((e) => {
      setViewState(fileId, {
        cursorPosition: e.position,
        scrollPosition: { scrollTop: editor.getScrollTop(), scrollLeft: editor.getScrollLeft() },
      });
      // Update StatusBar store
      useStatusBarStore.getState().updateCursor(e.position.lineNumber, e.position.column);
    });

    const d2 = editor.onDidScrollChange((e) => {
      setViewState(fileId, {
        cursorPosition: editor.getPosition(),
        scrollPosition: { scrollTop: e.scrollTop, scrollLeft: e.scrollLeft },
      });
    });

    listenerDisposablesRef.current = [d1, d2];

    // Add Ctrl+S action to trigger real save API
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, async () => {
      const currentVal = editor.getValue();
      const saveStore = useSaveStore.getState();
      
      const success = await saveStore.saveFile(fileId, currentVal);
      if (success) {
        addToast({ type: 'success', title: 'File saved', message: `${filename} was saved successfully.` });
      } else {
        const status = saveStore.fileStatuses[fileId];
        if (status === 'conflicted') {
           addToast({ type: 'error', title: 'Save Conflict', message: `${filename} was modified by another process. Please resolve conflicts.` });
        } else {
           addToast({ type: 'error', title: 'Save Failed', message: `Could not save ${filename}.` });
        }
      }
    });

    // Add Ctrl+Shift+S to save all files
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyS, async () => {
      const saveStore = useSaveStore.getState();
      
      // Force current editor value to store first to ensure latest is saved
      const currentVal = editor.getValue();
      useEditorStore.getState().setFileContent(fileId, currentVal, true);

      await saveStore.saveAll();
      addToast({ type: 'success', title: 'Save All', message: `All files have been saved.` });
    });
  }, [fileId, filename, viewStates, setViewState, addToast]);

  const handleRestore = useCallback(async () => {
    if (!selectedVersion) return;
    const confirmed = await confirm({
      title: "Restore Version",
      description: `Are you sure you want to restore Version ${selectedVersion.version_number}? This will create a new version.`,
      confirmText: "Restore",
    });
    if (confirmed) {
      const success = await restoreVersion(fileId, selectedVersion.version_number);
      if (success) {
        setFileContent(fileId, selectedVersion.content, false);
        addToast({ type: 'success', title: 'Version Restored', message: `Successfully restored Version ${selectedVersion.version_number}` });
      }
    }
  }, [selectedVersion, fileId, restoreVersion, setFileContent, addToast, confirm]);

  const isDiffMode = selectedVersion && selectedVersion.file_id === fileId;

  return (
    <div className="flex-1 w-full h-full relative">
      {isDiffMode && (
        <div className="absolute top-4 right-8 z-10">
          <button 
            onClick={handleRestore}
            aria-label={`Restore version ${selectedVersion.version_number}`}
            className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow-md transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restore Version {selectedVersion.version_number}
          </button>
        </div>
      )}

      {isDiffMode ? (
        <DiffEditor
          height="100%"
          language={language}
          theme={computedTheme}
          original={selectedVersion.content}
          modified={content}
          // Force model cleanup when leaving diff mode to prevent Monaco model registry leaks
          keepCurrentOriginalModel={false}
          keepCurrentModifiedModel={false}
          options={{
            renderSideBySide: true,
            fontSize: settings.fontSize,
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            fontLigatures: true,
            minimap: { enabled: false },
            readOnly: true, // While diffing, prevent edits
          }}
        />
      ) : (
        <Editor
          height="100%"
          language={language}
          theme={computedTheme}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center w-full h-full text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 mx-auto" />
            </div>
          }
          options={{
            fontSize: settings.fontSize,
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap,
            minimap: { enabled: settings.minimap },
            lineNumbers: settings.lineNumbers,
            autoClosingBrackets: settings.autoClosingBrackets,
            renderWhitespace: settings.renderWhitespace,
            automaticLayout: true,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
            fontLigatures: true,
          }}
        />
      )}
    </div>
  );
};
