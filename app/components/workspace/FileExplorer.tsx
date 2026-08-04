import React, { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { workspaceApi } from '../../lib/api/workspace';

import type { FileNode, FolderTree, ProjectTree } from '../../lib/api/workspace';

import { FolderItem } from './FolderItem';

import { FileItem } from './FileItem';

import { FolderPlus, FilePlus, RefreshCw, ChevronsUp } from 'lucide-react';
import { SudarshanaMandala } from '../ui/SplashLoader';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

import { useEditorStore } from '../../stores/useEditorStore';

import { useNotificationStore } from '../../stores/useNotificationStore';

import { Modal } from '../ui/Modal';

import { Button } from '../ui/Button';

import { Input } from '../ui/Input';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';

type FlatNode = 
  | { type: 'folder'; folder: FolderTree; level: number }
  | { type: 'file'; file: FileNode; level: number };

const flattenTree = (folders: FolderTree[], files: FileNode[], level: number, expandedState: Record<string, boolean>): FlatNode[] => {
  const result: FlatNode[] = [];
  for (const folder of folders) {
    result.push({ type: 'folder', folder, level });
    if (expandedState[folder.id]) {
      result.push(...flattenTree(folder.children || [], folder.files || [], level + 1, expandedState));
    }
  }
  for (const file of files) {
    result.push({ type: 'file', file, level });
  }
  return result;
};

type DialogState = {
  isOpen: boolean;
  type: 'CREATE_FOLDER' | 'CREATE_FILE' | 'RENAME_FOLDER' | 'RENAME_FILE' | 'DELETE_FOLDER' | 'DELETE_FILE' | null;
  title: string;
  label: string;
  value: string;
  targetId: string | null;
  targetName?: string;
};

interface FileExplorerProps {
  projectId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const { expandFolder, collapseAll, activeFolderId, setActiveFolder } = useWorkspaceStore();
  
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: null,
    title: '',
    label: '',
    value: '',
    targetId: null,
  });

  const expandedFolders = useWorkspaceStore(state => state.expandedFolders);
  const parentRef = useRef<HTMLDivElement>(null);
  
  const { data: tree, isLoading, isError, error } = useQuery({
    queryKey: ['workspace', projectId],
    queryFn: () => workspaceApi.getProjectTree(projectId),
  });

  const invalidateTree = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
  };

  const updateCacheItem = (id: string, name?: string, isFolder?: boolean) => {
    if (!name) return;
    queryClient.setQueryData<ProjectTree>(['workspace', projectId], (old) => {
      if (!old) return old;
      const clone = JSON.parse(JSON.stringify(old)) as ProjectTree;
      const traverse = (folders: FolderTree[], files: FileNode[]) => {
        if (!isFolder) {
          const f = files.find(x => x.id === id);
          if (f) { f.name = name; return true; }
        } else {
          const f = folders.find(x => x.id === id);
          if (f) { f.name = name; return true; }
        }
        for (const folder of folders) {
          if (traverse(folder.children || [], folder.files || [])) return true;
        }
        return false;
      };
      traverse(clone.folders, clone.files);
      return clone;
    });
  };

  const removeCacheItem = (id: string, isFolder: boolean) => {
    queryClient.setQueryData<ProjectTree>(['workspace', projectId], (old) => {
      if (!old) return old;
      const clone = JSON.parse(JSON.stringify(old)) as ProjectTree;
      const traverse = (folders: FolderTree[], files: FileNode[]) => {
        if (!isFolder) {
          const idx = files.findIndex(x => x.id === id);
          if (idx !== -1) { files.splice(idx, 1); return true; }
        } else {
          const idx = folders.findIndex(x => x.id === id);
          if (idx !== -1) { folders.splice(idx, 1); return true; }
        }
        for (const folder of folders) {
          if (traverse(folder.children || [], folder.files || [])) return true;
        }
        return false;
      };
      traverse(clone.folders, clone.files);
      return clone;
    });
  };

  const { tabs, openTab, activeFileId } = useEditorStore();

  // Auto-open first file on initial project load
  useEffect(() => {
    if (tree && tabs.length === 0 && !activeFileId) {
      const findFirstFile = (folders: FolderTree[], files: FileNode[]): FileNode | null => {
        if (files.length > 0) return files[0];
        for (const folder of folders) {
          const res = findFirstFile(folder.children || [], folder.files || []);
          if (res) return res;
        }
        return null;
      };
      
      const file = findFirstFile(tree.folders, tree.files);
      if (file) {
        openTab({ id: file.id, name: file.name, language: file.language });
      }
    }
  }, [tree, tabs.length, activeFileId, openTab]);

  const flatNodes = useMemo(() => {
    if (!tree) return [];
    return flattenTree(tree.folders, tree.files, 0, expandedFolders);
  }, [tree, expandedFolders]);

  const rowVirtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  // Mutations
  const createFolderMut = useMutation({
    mutationFn: workspaceApi.createFolder,
    onSuccess: (data) => {
      if (data.parent_id) expandFolder(data.parent_id);
      invalidateTree();
    }
  });

  const updateFolderMut = useMutation({
    mutationFn: (args: { id: string; name?: string; parent_id?: string | null }) => workspaceApi.updateFolder(args.id, { name: args.name, parent_id: args.parent_id }),
    onMutate: async (args) => {
      const treeKey = ['workspace', projectId];
      await queryClient.cancelQueries({ queryKey: treeKey });
      const snapshot = queryClient.getQueryData(treeKey);
      if (args.name) updateCacheItem(args.id, args.name, true);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['workspace', projectId], context?.snapshot);
      useNotificationStore.getState().addToast({
        type: 'error',
        title: 'Rename failed',
        message: 'Could not rename folder. Your changes have been restored.',
      });
    },
    onSettled: invalidateTree
  });

  const deleteFolderMut = useMutation({
    mutationFn: workspaceApi.deleteFolder,
    onMutate: async (id) => {
      const treeKey = ['workspace', projectId];
      await queryClient.cancelQueries({ queryKey: treeKey });
      const snapshot = queryClient.getQueryData(treeKey);
      removeCacheItem(id, true);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['workspace', projectId], context?.snapshot);
      useNotificationStore.getState().addToast({
        type: 'error',
        title: 'Delete failed',
        message: 'Could not delete folder. The tree has been restored.',
      });
    },
    onSettled: invalidateTree
  });

  const createFileMut = useMutation({
    mutationFn: workspaceApi.createFile,
    onSuccess: (data) => {
      if (data.folder_id) expandFolder(data.folder_id);
      invalidateTree();
    }
  });

  const updateFileMut = useMutation({
    mutationFn: (args: { id: string; name?: string; folder_id?: string | null }) => workspaceApi.updateFile(args.id, { name: args.name, folder_id: args.folder_id }),
    onMutate: async (args) => {
      const treeKey = ['workspace', projectId];
      await queryClient.cancelQueries({ queryKey: treeKey });
      const snapshot = queryClient.getQueryData(treeKey);
      if (args.name) {
        updateCacheItem(args.id, args.name, false);
        useEditorStore.getState().updateTab(args.id, { name: args.name });
      }
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['workspace', projectId], context?.snapshot);
      useNotificationStore.getState().addToast({
        type: 'error',
        title: 'Rename failed',
        message: 'Could not rename file. Your changes have been restored.',
      });
    },
    onSettled: invalidateTree
  });

  const deleteFileMut = useMutation({
    mutationFn: workspaceApi.deleteFile,
    onMutate: async (id) => {
      // Snapshot the cache BEFORE removing — allows rollback if server DELETE fails
      const treeKey = ['workspace', projectId];
      await queryClient.cancelQueries({ queryKey: treeKey });
      const snapshot = queryClient.getQueryData(treeKey);
      removeCacheItem(id, false);
      // NOTE: closeTab is intentionally NOT called here.
      // It is called in onSuccess only after the server confirms deletion.
      return { id, snapshot };
    },
    onSuccess: (_data, id) => {
      // Server confirmed the delete — safe to close the tab now
      useEditorStore.getState().closeTab(id);
    },
    onError: (_error, _id, context) => {
      // Server DELETE failed — restore the cache so the file reappears
      queryClient.setQueryData(['workspace', projectId], context?.snapshot);
      useNotificationStore.getState().addToast({
        type: 'error',
        title: 'Delete failed',
        message: 'Failed to delete file. Your changes are preserved.',
      });
    },
    onSettled: invalidateTree
  });

  const duplicateFileMut = useMutation({
    mutationFn: workspaceApi.duplicateFile,
    onSuccess: invalidateTree
  });

  const handleDropItem = (draggedId: string, type: 'file' | 'folder', targetFolderId: string | null) => {
    if (type === 'file') {
      updateFileMut.mutate({ id: draggedId, folder_id: targetFolderId });
    } else {
      if (draggedId === targetFolderId) return;

      // BUG C3: Walk the ancestor chain of targetFolderId to detect circular moves.
      // If draggedId appears as an ancestor of targetFolderId, the move would create
      // a cycle (e.g. moving a parent folder into one of its own descendants).
      const isDescendant = (ancestorId: string, childId: string | null): boolean => {
        if (childId === null) return false;
        const currentTree = queryClient.getQueryData<import('../../lib/api/workspace').ProjectTree>(['workspace', projectId]);
        if (!currentTree) return false;
        // Find the folder with childId and check its parent_id
        const findFolder = (folders: import('../../lib/api/workspace').FolderTree[]): import('../../lib/api/workspace').FolderTree | null => {
          for (const f of folders) {
            if (f.id === childId) return f;
            const found = findFolder(f.children || []);
            if (found) return found;
          }
          return null;
        };
        const folder = findFolder(currentTree.folders);
        if (!folder) return false;
        if (folder.parent_id === ancestorId) return true;
        return isDescendant(ancestorId, folder.parent_id);
      };

      if (isDescendant(draggedId, targetFolderId)) {
        useNotificationStore.getState().addToast({
          type: 'warning',
          title: 'Invalid move',
          message: 'Cannot move a folder into its own subfolder.',
        });
        return;
      }

      updateFolderMut.mutate({ id: draggedId, parent_id: targetFolderId });
    }
  };

  // Handlers
  const handleCreateFolder = (parentId: string | null) => {
    setDialog({ isOpen: true, type: 'CREATE_FOLDER', title: 'New Folder', label: 'Folder name:', value: '', targetId: parentId });
  };

  const handleCreateFile = (folderId: string | null) => {
    setDialog({ isOpen: true, type: 'CREATE_FILE', title: 'New File', label: 'File name:', value: '', targetId: folderId });
  };

  const handleRenameFolder = (folder: FolderTree) => {
    setDialog({ isOpen: true, type: 'RENAME_FOLDER', title: 'Rename Folder', label: 'New name:', value: folder.name, targetId: folder.id });
  };

  const handleDeleteFolder = (folder: FolderTree) => {
    setDialog({ isOpen: true, type: 'DELETE_FOLDER', title: 'Delete Folder', label: '', value: '', targetId: folder.id, targetName: folder.name });
  };

  const handleRenameFile = (file: FileNode) => {
    setDialog({ isOpen: true, type: 'RENAME_FILE', title: 'Rename File', label: 'New name:', value: file.name, targetId: file.id });
  };

  const handleDeleteFile = (file: FileNode) => {
    setDialog({ isOpen: true, type: 'DELETE_FILE', title: 'Delete File', label: '', value: '', targetId: file.id, targetName: file.name });
  };

  const submitDialog = () => {
    const { type, value, targetId } = dialog;
    const name = value.trim();

    if (type === 'CREATE_FOLDER' && name) {
      createFolderMut.mutate({ project_id: projectId, name, parent_id: targetId });
    } else if (type === 'CREATE_FILE' && name) {
      createFileMut.mutate({ project_id: projectId, name, folder_id: targetId });
    } else if (type === 'RENAME_FOLDER' && name) {
      updateFolderMut.mutate({ id: targetId!, name });
    } else if (type === 'RENAME_FILE' && name) {
      updateFileMut.mutate({ id: targetId!, name });
    } else if (type === 'DELETE_FOLDER') {
      deleteFolderMut.mutate(targetId!);
    } else if (type === 'DELETE_FILE') {
      deleteFileMut.mutate(targetId!);
    }
    
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleDuplicateFile = (file: FileNode) => {
    duplicateFileMut.mutate(file.id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 text-gray-500">
        <SudarshanaMandala className="w-5 h-5 mr-2" />
        <span className="text-sm">Loading workspace...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-500 flex flex-col items-center text-center">
        <p>Failed to load workspace.</p>
        <p className="text-xs mt-1 opacity-80">{(error as Error)?.message}</p>
        <button onClick={invalidateTree} className="mt-3 flex items-center text-primary hover:underline">
          <RefreshCw size={14} className="mr-1" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10 border-b border-gray-100 dark:border-gray-800">
        <span>Explorer</span>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => handleCreateFile(activeFolderId)} 
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={() => handleCreateFolder(activeFolderId)} 
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
          <button 
            onClick={collapseAll} 
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Collapse All"
          >
            <ChevronsUp size={14} />
          </button>
          <button 
            onClick={invalidateTree} 
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto py-2"
        onClick={() => setActiveFolder(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            // If dropped on the root container directly (not a child folder)
            handleDropItem(data.id, data.type, null);
          } catch {}
        }}
      >
        {(!tree?.folders?.length && !tree?.files?.length) ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Workspace is empty</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleCreateFile(null)}
                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 py-1.5 px-3 rounded-md transition-colors"
              >
                Create File
              </button>
              <button 
                onClick={() => handleCreateFolder(null)}
                className="text-xs border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 py-1.5 px-3 rounded-md transition-colors"
              >
                Create Folder
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const node = flatNodes[virtualRow.index];
              return (
                <div
                  key={node.type === 'folder' ? `folder-${node.folder.id}` : `file-${node.file.id}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {node.type === 'folder' ? (
                    <FolderItem onDropItem={handleDropItem}
                      folder={{...node.folder, children: [], files: []}} // Prevent recursive render
                      level={node.level}
                      onRenameFolder={handleRenameFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onCreateFile={handleCreateFile}
                      onCreateFolder={handleCreateFolder}
                      onRenameFile={handleRenameFile}
                      onDeleteFile={handleDeleteFile}
                      onDuplicateFile={handleDuplicateFile}
                    />
                  ) : (
                    <FileItem onDropItem={handleDropItem}
                      file={node.file}
                      level={node.level}
                      onRename={handleRenameFile}
                      onDelete={handleDeleteFile}
                      onDuplicate={handleDuplicateFile}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button 
              variant={dialog.type?.startsWith('DELETE') ? 'destructive' : 'default'}
              onClick={submitDialog}
            >
              {dialog.type?.startsWith('DELETE') ? 'Delete' : 'Confirm'}
            </Button>
          </>
        }
      >
        {dialog.type?.startsWith('DELETE') ? (
          <p>Are you sure you want to delete "{dialog.targetName}"? This action cannot be undone.</p>
        ) : (
          <div className="space-y-4">
            <label className="text-sm font-medium">{dialog.label}</label>
            <Input
              autoFocus
              value={dialog.value}
              onChange={(e) => setDialog(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDialog();
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
