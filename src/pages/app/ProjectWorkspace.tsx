import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import { FileExplorer } from "../../components/workspace/FileExplorer";
import { EditorTabs } from "../../components/workspace/EditorTabs";
import { EditorPane } from "../../components/workspace/EditorPane";
import { StatusBar } from "../../components/workspace/StatusBar";
import { BottomPanel } from "../../components/workspace/BottomPanel";
import { VersionHistoryPanel } from "../../components/workspace/VersionHistoryPanel";
import { GitPanel } from "../../components/workspace/GitPanel";
import { useEditorStore } from "../../store/useEditorStore";
import { useSaveStore } from "../../store/useSaveStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useExecutionStore } from "../../store/useExecutionStore";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { projectsApi } from "../../lib/api/projects";
import { useQuery } from "@tanstack/react-query";

import { useStatusBarStore } from "../../store/useStatusBarStore";
import { AlertCircle, WifiOff, Copy, Search, GitBranch, BugPlay, Blocks, CircleUser, Settings } from 'lucide-react';
import { PanelErrorBoundary } from "../../components/error/ErrorBoundaries";

type Tab = 'PROBLEMS' | 'OUTPUT' | 'INPUT' | 'EXECUTION' | 'TERMINAL';

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const saveFile = useSaveStore(s => s.saveFile);
  const saveAll = useSaveStore(s => s.saveAll);
  const { addToast } = useNotificationStore();
  const { connectionStatus } = useStatusBarStore();

  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    const saved = localStorage.getItem('hamara-bottom-panel-open');
    return saved ? saved === 'true' : false;
  });
  const [activePanelTab, setActivePanelTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('hamara-bottom-panel-tab');
    return (saved as Tab) || 'PROBLEMS';
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Explorer Resizer State
  const [explorerWidth, setExplorerWidth] = useState(() => {
    const saved = localStorage.getItem('hamara-explorer-width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'FILES' | 'SEARCH' | 'GIT' | 'RUN' | 'EXTENSIONS' | null>(() => {
    const saved = localStorage.getItem('hamara-sidebar-tab');
    if (saved === 'null') return null;
    if (saved === null) return 'FILES';
    return saved as 'FILES' | 'SEARCH' | 'GIT' | 'RUN' | 'EXTENSIONS' | null;
  });

  useEffect(() => {
    localStorage.setItem('hamara-sidebar-tab', sidebarTab === null ? 'null' : sidebarTab);
  }, [sidebarTab]);

  const initializedProject = useRef<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => id ? projectsApi.getProject(id) : Promise.reject('No ID'),
    enabled: !!id,
  });

  useEffect(() => {
    if (id && initializedProject.current !== id) {
      initializedProject.current = id;
      useEditorStore.getState().setProject(id);
    }
  }, [id]);

  useEffect(() => {
    if (project?.data?.language) {
      useEditorStore.getState().setProjectLanguage(project.data.language);
    }
  }, [project?.data?.language, id]);

  // Persist bottom panel state
  useEffect(() => {
    localStorage.setItem('hamara-bottom-panel-open', isPanelOpen.toString());
  }, [isPanelOpen]);

  useEffect(() => {
    localStorage.setItem('hamara-bottom-panel-tab', activePanelTab);
  }, [activePanelTab]);

  useEffect(() => {
    // Draft recovery notification: read fresh state, not closure snapshot
    const { dirtyFiles } = useEditorStore.getState();
    const dirtyCount = Object.keys(dirtyFiles).filter(k => dirtyFiles[k]).length;
    if (dirtyCount > 0) {
      addToast({ 
        type: 'info', 
        title: 'Draft Recovered', 
        message: `Restored ${dirtyCount} unsaved draft${dirtyCount > 1 ? 's' : ''}.` 
      });
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Always read fresh state from the store — avoids stale closure from mount-time snapshot
      const hasDirtyFiles = Object.values(useEditorStore.getState().dirtyFiles).some(Boolean);
      if (hasDirtyFiles) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    const handleOnline = () => {
      useSaveStore.getState().retryFailedSaves();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally reads store via getState()

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        
        // Ctrl+Shift+S -> Save All
        if (e.shiftKey) {
          await saveAll();
          // Determine real outcome by checking if any file is now in failed state
          const statuses = useSaveStore.getState().fileStatuses;
          const anyFailed = Object.values(statuses).some(s => s === 'failed');
          if (anyFailed) {
            addToast({ type: 'error', title: 'Save All', message: 'Some files could not be saved.' });
          } else {
            addToast({ type: 'success', title: 'Save All', message: 'All modified files saved successfully.' });
          }
          return;
        }
        
        // Just Ctrl+S -> Save Active
        // Read fresh content from store (not stale closure)
        const { dirtyFiles, localContents, activeFileId: currentActiveFileId } = useEditorStore.getState();
        if (currentActiveFileId && dirtyFiles[currentActiveFileId]) {
          const content = localContents[currentActiveFileId];
          if (content !== undefined) {
            const success = await saveFile(currentActiveFileId, content);
            if (success) {
              addToast({ type: 'success', title: 'File saved', message: 'File saved successfully.' });
            } else {
              addToast({ type: 'error', title: 'Save Failed', message: 'Could not save the file.' });
            }
          }
        }
      }
      
      // Ctrl+H -> Toggle History
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
      }

      // Ctrl+` -> Toggle Panel and switch to Terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsPanelOpen(prev => {
          if (!prev) setActivePanelTab('TERMINAL');
          return !prev;
        });
      }

      // Ctrl+Enter -> Run Code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeFileId) {
          const { projectLanguage } = useEditorStore.getState();
          if (projectLanguage) {
            setIsPanelOpen(true);
            setActivePanelTab('EXECUTION');
            const { runCode } = useExecutionStore.getState();
            runCode(id as string, activeFileId, projectLanguage);
          } else {
            addToast({ type: 'warning', title: 'Cannot Run', message: 'Project language not loaded yet.' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dirtyFiles/localContents read via getState() inside handler
  }, [id, activeFileId, saveFile, saveAll, addToast]);

  // Handle Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // e.clientX is absolute, subtract Activity Bar width (48px)
      let newWidth = e.clientX - 48;
      
      if (newWidth < 100) {
        // Snap closed
        setSidebarTab(null);
        newWidth = 220; // reset the intended width for when it reopens
      } else {
        if (!sidebarTab) {
          // If dragging out from closed, default to FILES
          setSidebarTab('FILES');
        }
        if (newWidth > 500) newWidth = 500;
      }
      setExplorerWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('hamara-explorer-width', explorerWidth.toString());
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, explorerWidth]);


  // Cleanup on project switch (no longer resetting stores on unmount to preserve persistence)
  useEffect(() => {
    return () => {
      // We only reset execution and save state to avoid memory leaks or stale active processes
      useExecutionStore.getState().reset();
      useSaveStore.getState().reset();
    };
  }, [id]);

  // Custom event to open panel
  useEffect(() => {
    const handleOpenPanel = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: Tab }>;
      setIsPanelOpen(true);
      if (customEvent.detail?.tab) {
        setActivePanelTab(customEvent.detail.tab);
      }
    };
    window.addEventListener('IDE_OPEN_PANEL', handleOpenPanel);
    return () => window.removeEventListener('IDE_OPEN_PANEL', handleOpenPanel);
  }, []);

  if (!id) return <div>Invalid Project ID</div>;

  return (
    <div 
      className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background text-foreground"
      style={isDragging ? { cursor: 'col-resize' } : undefined}
    >
      {/* Activity Bar */}
      <div className="w-12 h-full border-r bg-[#1e1e1e] border-[#333] flex flex-col justify-between py-2 z-10 flex-shrink-0 text-gray-400 select-none">
        
        {/* Top Icons */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setSidebarTab(prev => prev === 'FILES' ? null : 'FILES')}
            className={cn(
              "p-3 transition-colors group relative w-full flex justify-center",
              sidebarTab === 'FILES' ? "text-white" : "hover:text-white"
            )}
            title="Explorer"
          >
            <Copy className="w-6 h-6 stroke-[1.5px]" />
            {sidebarTab === 'FILES' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-full bg-primary" />
            )}
          </button>
          
          <button
            onClick={() => setSidebarTab(prev => prev === 'SEARCH' ? null : 'SEARCH')}
            className={cn(
              "p-3 transition-colors group relative w-full flex justify-center",
              sidebarTab === 'SEARCH' ? "text-white" : "hover:text-white"
            )}
            title="Search"
          >
            <Search className="w-6 h-6 stroke-[1.5px]" />
            {sidebarTab === 'SEARCH' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-full bg-primary" />
            )}
          </button>

          <button
            onClick={() => setSidebarTab(prev => prev === 'GIT' ? null : 'GIT')}
            className={cn(
              "p-3 transition-colors group relative w-full flex justify-center",
              sidebarTab === 'GIT' ? "text-white" : "hover:text-white"
            )}
            title="Source Control"
          >
            <GitBranch className="w-6 h-6 stroke-[1.5px]" />
            {sidebarTab === 'GIT' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-full bg-primary" />
            )}
          </button>

          <button
            onClick={() => setSidebarTab(prev => prev === 'RUN' ? null : 'RUN')}
            className={cn(
              "p-3 transition-colors group relative w-full flex justify-center",
              sidebarTab === 'RUN' ? "text-white" : "hover:text-white"
            )}
            title="Run and Debug"
          >
            <BugPlay className="w-6 h-6 stroke-[1.5px]" />
            {sidebarTab === 'RUN' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-full bg-primary" />
            )}
          </button>

          <button
            onClick={() => setSidebarTab(prev => prev === 'EXTENSIONS' ? null : 'EXTENSIONS')}
            className={cn(
              "p-3 transition-colors group relative w-full flex justify-center",
              sidebarTab === 'EXTENSIONS' ? "text-white" : "hover:text-white"
            )}
            title="Extensions"
          >
            <Blocks className="w-6 h-6 stroke-[1.5px]" />
            {sidebarTab === 'EXTENSIONS' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-full bg-primary" />
            )}
          </button>
        </div>

        {/* Bottom Icons */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <button
            className="p-3 transition-colors hover:text-white w-full flex justify-center"
            title="Accounts"
          >
            <CircleUser className="w-6 h-6 stroke-[1.5px]" />
          </button>
          
          <button
            className="p-3 transition-colors hover:text-white w-full flex justify-center"
            title="Manage"
          >
            <Settings className="w-6 h-6 stroke-[1.5px]" />
          </button>
        </div>
      </div>

      {/* Sidebar / Explorer */}
      {sidebarTab !== null && (
        <div 
          style={{ width: explorerWidth }}
          className="flex-shrink-0 flex flex-col bg-muted overflow-hidden border-r border-border/50"
        >
          <PanelErrorBoundary panelName="Sidebar">
            {sidebarTab === 'FILES' ? (
              <FileExplorer projectId={id} />
            ) : sidebarTab === 'GIT' ? (
              <GitPanel projectId={id} />
            ) : (
              <div className="p-4 flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <p className="text-sm font-medium mb-2">{sidebarTab} coming soon.</p>
                <p className="text-xs opacity-70">This feature is currently under development.</p>
              </div>
            )}
          </PanelErrorBoundary>
        </div>
      )}

      {/* Resizer Divider */}
      <div 
        className={cn(
          "w-1 z-10 cursor-col-resize hover:bg-primary/50 transition-colors flex-shrink-0",
          isDragging ? "bg-primary" : "bg-gray-200 dark:bg-[#2d2d2d]"
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDoubleClick={() => {
          if (sidebarTab === null) {
            setSidebarTab('FILES');
            setExplorerWidth(300);
          } else {
            setSidebarTab(null);
          }
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
        <EditorTabs />

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {connectionStatus === 'Disconnected' && (
            <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 flex items-center justify-center text-sm font-medium z-10 shadow-sm">
              <WifiOff className="w-4 h-4 mr-2" />
              Backend disconnected. Code execution and saves may fail. Retrying connection...
            </div>
          )}
          {activeFileId ? (
            <PanelErrorBoundary panelName="Editor">
              <EditorPane key={activeFileId} fileId={activeFileId} />
            </PanelErrorBoundary>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 h-full w-full select-none bg-gray-50 dark:bg-background">
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-[#454545] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <p className="text-lg font-medium text-gray-500 dark:text-[#858585]">Hamara Editor</p>
                <p className="mt-2 text-sm text-gray-400 dark:text-[#656565]">Select a file from the explorer to view</p>
                <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-gray-400 dark:text-[#555555]">
                  <div className="flex flex-col items-center"><span className="font-semibold mb-1 border border-gray-200 dark:border-[#333] rounded px-1.5 py-0.5">Ctrl+S</span>Save</div>
                  <div className="flex flex-col items-center"><span className="font-semibold mb-1 border border-gray-200 dark:border-[#333] rounded px-1.5 py-0.5">Ctrl+Shift+S</span>Save All</div>
                  <div className="flex flex-col items-center"><span className="font-semibold mb-1 border border-gray-200 dark:border-[#333] rounded px-1.5 py-0.5">Ctrl+`</span>Toggle Panel</div>
                  <div className="flex flex-col items-center"><span className="font-semibold mb-1 border border-gray-200 dark:border-[#333] rounded px-1.5 py-0.5">Ctrl+H</span>History</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <PanelErrorBoundary panelName="Bottom Panel">
          <BottomPanel 
            projectId={id}
            isOpen={isPanelOpen} 
            onClose={() => setIsPanelOpen(!isPanelOpen)} 
            activeTab={activePanelTab}
            setActiveTab={setActivePanelTab}
          />
        </PanelErrorBoundary>
        
        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Right Sidebar - Version History */}
      <VersionHistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
}
