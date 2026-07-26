/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
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

import { useEditorStore } from "../../stores/useEditorStore";

import { useSaveStore } from "../../stores/useSaveStore";

import { useNotificationStore } from "../../stores/useNotificationStore";

import { useExecutionStore } from "../../stores/useExecutionStore";

import { projectsApi } from "../../lib/api/projects";

import { useQuery } from "@tanstack/react-query";

import { useStatusBarStore } from "../../stores/useStatusBarStore";

import { WifiOff, Copy, Search, GitBranch, BugPlay, CircleUser, Settings, Check } from 'lucide-react';
import { PanelErrorBoundary } from "../../components/error/ErrorBoundary";

import { Dropdown, DropdownItem, DropdownSeparator } from "../../components/ui/Dropdown";

import { EditorSettingsModal } from "../../components/workspace/EditorSettingsModal";

import { GuestConversionModal } from "../../components/auth/GuestConversionModal";

type Tab = 'PROBLEMS' | 'OUTPUT' | 'INPUT' | 'EXECUTION' | 'TERMINAL';

export default function ProjectWorkspace({ projectId }: { projectId?: string } = {}) {
  const params = useParams<{ id: string }>();
  const id = projectId || params.id;
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const saveFile = useSaveStore(s => s.saveFile);
  const saveAll = useSaveStore(s => s.saveAll);
  const { addToast } = useNotificationStore();
  const { connectionStatus } = useStatusBarStore();

  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('hamara-bottom-panel-open');
    return saved ? saved === 'true' : false;
  });
  const [activePanelTab, setActivePanelTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'PROBLEMS';
    const saved = localStorage.getItem('hamara-bottom-panel-tab');
    return (saved as Tab) || 'PROBLEMS';
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Explorer Resizer State
  const [explorerWidth, setExplorerWidth] = useState(() => {
    if (typeof window === 'undefined') return 300;
    const saved = localStorage.getItem('hamara-explorer-width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'FILES' | 'SEARCH' | 'GIT' | 'RUN' | 'EXTENSIONS' | null>(() => {
    if (typeof window === 'undefined') return 'FILES';
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
  }, []);

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
  }, [isDragging, explorerWidth, sidebarTab]);

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
      <div className="w-12 h-full border-r bg-[#1e1e1e] border-[#333] flex flex-col justify-between py-2 z-50 flex-shrink-0 text-gray-400 select-none">
        
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

        </div>

        {/* Bottom Icons */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <Dropdown
            align="left"
            side="top"
            trigger={
              <button
                className="p-3 transition-colors hover:text-white w-full flex justify-center"
                title="Accounts"
              >
                <CircleUser className="w-6 h-6 stroke-[1.5px]" />
              </button>
            }
          >
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground flex items-center justify-between">
              Accounts
            </div>
            <DropdownSeparator />
            <DropdownItem onClick={() => window.location.href = '/api/v1/auth/oauth/github/authorize'}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Connect GitHub</span>
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem>
              <Check className="mr-2 h-4 w-4 opacity-0" />
              <span>Settings Sync is On</span>
            </DropdownItem>
            <DropdownItem>
              <Check className="mr-2 h-4 w-4 opacity-0" />
              <span>Turn on Cloud Changes...</span>
            </DropdownItem>
            <DropdownItem>
              <Check className="mr-2 h-4 w-4 opacity-0" />
              <span>Turn on Remote Tunnel Access...</span>
            </DropdownItem>
          </Dropdown>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 transition-colors hover:text-white w-full flex justify-center"
            title="Manage"
          >
            <Settings className="w-6 h-6 stroke-[1.5px]" />
          </button>
        </div>
      </div>
      <EditorSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <GuestConversionModal />

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
