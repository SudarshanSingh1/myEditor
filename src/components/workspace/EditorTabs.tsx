import React, { useRef, useEffect } from 'react';
import type { WheelEvent } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { useExecutionStore } from '../../store/useExecutionStore';
import { useParams } from 'react-router-dom';
import { X, Circle, Play, Square, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FileIcon } from './FileIcon';
import { EditorSettingsModal } from './EditorSettingsModal';
import { Settings } from 'lucide-react';

export const EditorTabs: React.FC = () => {
  const tabs = useEditorStore(state => state.tabs);
  const activeFileId = useEditorStore(state => state.activeFileId);
  const dirtyFiles = useEditorStore(state => state.dirtyFiles);
  const setActiveFile = useEditorStore(state => state.setActiveFile);
  const closeTab = useEditorStore(state => state.closeTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [closingFileId, setClosingFileId] = React.useState<string | null>(null);

  // Allow horizontal scrolling using mouse wheel
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleTabClose = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    
    // Warn if dirty
    if (dirtyFiles[fileId]) {
      setClosingFileId(fileId);
      return;
    }
    closeTab(fileId);
  };

  const handleMiddleClick = (e: React.MouseEvent, fileId: string) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      handleTabClose(e, fileId);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-muted border-b border-border justify-between">
      <div 
        className="flex overflow-x-auto no-scrollbar flex-1"
        ref={scrollRef}
        onWheel={handleWheel}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((file) => {
          const isActive = activeFileId === file.id;
          const isDirty = dirtyFiles[file.id];

          const isPreview = file.isPreview;

          return (
            <div
              key={file.id}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer border-r border-border min-w-32 max-w-xs group select-none transition-colors flex-shrink-0",
                isActive 
                  ? "bg-background border-t-2 border-t-primary text-foreground" 
                  : "text-muted-foreground hover:bg-background/50 border-t-2 border-t-transparent",
                isPreview && "italic"
              )}
              onClick={() => setActiveFile(file.id)}
              onDoubleClick={() => useEditorStore.getState().pinTab(file.id)}
              onAuxClick={(e) => handleMiddleClick(e, file.id)}
              title={file.path || file.name}
            >
              <FileIcon name={file.name} size={14} className={cn("flex-shrink-0 opacity-80", isPreview && "not-italic")} />
              <span className={cn("truncate flex-1", isDirty && "text-amber-600 dark:text-amber-400 not-italic")}>{file.name}</span>
              <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                {isDirty ? (
                  <button
                    className="p-0.5 rounded-sm opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-500 flex items-center justify-center"
                    onClick={(e) => handleTabClose(e, file.id)}
                  >
                    <Circle className="h-2 w-2 fill-current group-hover:hidden" />
                    <X className="h-3.5 w-3.5 hidden group-hover:block" />
                  </button>
                ) : (
                  <button 
                    className={cn(
                      "p-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => handleTabClose(e, file.id)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <EditorActions />
      
      <Modal
        isOpen={!!closingFileId}
        onClose={() => setClosingFileId(null)}
        title="Unsaved Changes"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosingFileId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (closingFileId) {
                  closeTab(closingFileId);
                  setClosingFileId(null);
                }
              }}
            >
              Close Anyway
            </Button>
          </>
        }
      >
        <p>You have unsaved changes. Are you sure you want to close this file? All unsaved changes will be lost.</p>
      </Modal>
    </div>
  );
};

const EditorActions: React.FC = () => {
  const activeFileId = useEditorStore(state => state.activeFileId);
  const projectLanguage = useEditorStore(state => state.projectLanguage);
  const tabs = useEditorStore(state => state.tabs);
  
  const runCode = useExecutionStore(state => state.runCode);
  const stopCode = useExecutionStore(state => state.stopCode);
  const isRunning = useExecutionStore(state => state.isRunning);
  const isCancelling = useExecutionStore(state => state.isCancelling);
  const { id: projectId } = useParams<{ id: string }>();

  const activeFile = tabs.find(t => t.id === activeFileId);
  const ext = activeFile?.name.split('.').pop()?.toLowerCase() || '';
  const extToLabel: Record<string, string> = {
    'py': 'Python',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'c': 'C',
    'cpp': 'C++',
    'cc': 'C++',
    'cxx': 'C++',
    'java': 'Java',
    'rs': 'Rust',
    'go': 'Go'
  };
  const displayLanguage = extToLabel[ext] || projectLanguage;

  const isRunnable = !!displayLanguage;

  const disabledReason = !displayLanguage 
    ? 'No runnable file detected'
    : !activeFileId 
      ? 'No active file'
      : isRunning 
        ? 'Already running'
        : null;

  return (
    <div className="flex items-center px-2 space-x-2 border-l border-border bg-background">
      {isRunnable && (
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-[#2d2d2d] dark:text-gray-400">
          {displayLanguage}
        </span>
      )}
      <button
        disabled={!!disabledReason}
        onClick={() => {
          if (projectId && activeFileId && displayLanguage) {
            window.dispatchEvent(new CustomEvent('IDE_OPEN_PANEL', { detail: { tab: 'TERMINAL' } }));
            runCode(projectId, activeFileId, displayLanguage);
          }
        }}
        className={cn(
          "flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium transition-colors",
          !isRunnable 
            ? "opacity-50 cursor-not-allowed text-gray-400" 
            : isRunning
              ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-[#2d2d2d]"
              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
        )}
        title="Run Code (Ctrl+Enter)"
      >
        {isRunning && !isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        <span>{isRunning && !isCancelling ? 'Running...' : 'Run'}</span>
      </button>

      {isRunning && (
        <button
          onClick={stopCode}
          disabled={isCancelling}
          className={cn(
            "flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium transition-colors",
            isCancelling 
              ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-[#2d2d2d]" 
              : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          )}
          title="Stop Execution"
        >
          {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
          <span>{isCancelling ? 'Stopping' : 'Stop'}</span>
        </button>
      )}

    </div>
  );
};
