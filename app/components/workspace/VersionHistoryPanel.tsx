import { useEffect, useState } from 'react';

import { useVersionStore } from '../../stores/useVersionStore';

import { useEditorStore } from '../../stores/useEditorStore';

import { History, Clock, Search, X, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useConfirm } from "../../components/ui/ConfirmProvider";
import { useShallow } from 'zustand/react/shallow';

export function VersionHistoryPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { activeFileId, tabs } = useEditorStore(useShallow(state => ({ activeFileId: state.activeFileId, tabs: state.tabs })));
  const { confirm } = useConfirm();
  const { versions, fetchVersions, fetchVersionContent, selectedVersion, clearSelectedVersion, deleteVersion } = useVersionStore();
  const [search, setSearch] = useState('');

  const activeFileName = tabs.find(t => t.id === activeFileId)?.name || 'File';
  const fileVersions = activeFileId ? (versions[activeFileId] || []) : [];

  useEffect(() => {
    if (isOpen && activeFileId) {
      fetchVersions(activeFileId);
    }
  }, [isOpen, activeFileId, fetchVersions]);

  if (!isOpen) return null;

  const filteredVersions = fileVersions.filter(v => 
    v.version_number.toString().includes(search) || 
    (v.created_by && v.created_by.includes(search))
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const handleSelectVersion = async (versionNumber: number) => {
    if (activeFileId) {
      if (selectedVersion?.version_number === versionNumber) {
        clearSelectedVersion();
      } else {
        await fetchVersionContent(activeFileId, versionNumber);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, versionNumber: number) => {
    e.stopPropagation();
    if (activeFileId) {
      const confirmed = await confirm({
        title: "Delete Version",
        description: "Are you sure you want to delete this version?",
        confirmText: "Delete",
        variant: "destructive"
      });
      if (confirmed) {
        await deleteVersion(activeFileId, versionNumber);
        if (selectedVersion?.version_number === versionNumber) {
          clearSelectedVersion();
        }
      }
    }
  };

  return (
    <div className="w-80 border-l border-border bg-muted flex flex-col flex-shrink-0 h-full overflow-hidden">
      <div className="h-10 px-4 flex items-center justify-between border-b border-border bg-background">
        <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
          <History className="w-4 h-4 mr-2" />
          Version History
        </div>
        <button
          onClick={onClose}
          aria-label="Close version history panel"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {activeFileId ? (
        <>
          <div className="p-3 border-b border-border">
            <div className="text-xs text-gray-500 mb-2 truncate">
              History for <span className="font-semibold text-gray-700 dark:text-gray-300">{activeFileName}</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search versions..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded text-foreground placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredVersions.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No history found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#2d2d2d]">
                {filteredVersions.map((v, idx) => {
                  const isSelected = selectedVersion?.version_number === v.version_number;
                  const isLatest = idx === 0;

                  return (
                    <div 
                      key={v.id}
                      onClick={() => handleSelectVersion(v.version_number)}
                      className={`p-3 cursor-pointer transition-colors group relative ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20' 
                          : 'hover:bg-gray-100 dark:hover:bg-[#2a2d2e]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-foreground">
                            Version {v.version_number}
                          </span>
                          {isLatest && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                              Latest
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => handleDelete(e, v.version_number)}
                          aria-label={`Delete version ${v.version_number}`}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="truncate">
                          {formatSize(v.size)}
                        </div>
                        {isSelected && (
                          <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                            <ArrowLeftRight className="w-3 h-3 mr-1" />
                            Diffing
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 text-sm text-gray-500 text-center">
          Select a file to view its history.
        </div>
      )}
    </div>
  );
}
