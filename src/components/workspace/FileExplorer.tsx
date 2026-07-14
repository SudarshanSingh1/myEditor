import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '../../lib/api/workspace';
import type { FileNode, FolderTree, ProjectTree } from '../../lib/api/workspace';
import { FolderItem } from './FolderItem';
import { FileItem } from './FileItem';
import { Plus, FolderPlus, FilePlus, RefreshCw, Loader2, ChevronsUp } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useEditorStore } from '../../store/useEditorStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
  const { expandFolder, collapseAll } = useWorkspaceStore();
  
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: null,
    title: '',
    label: '',
    value: '',
    targetId: null,
  });
  
  const { data: tree, isLoading, isError, error } = useQuery({
    queryKey: ['workspace', projectId],
    queryFn: () => workspaceApi.getProjectTree(projectId),
  });

  const invalidateTree = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace', projectId] });
  };

  const updateCacheItem = (id: string, name: string, isFolder: boolean) => {
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

  // Mutations
  const createFolderMut = useMutation({
    mutationFn: workspaceApi.createFolder,
    onSuccess: (data) => {
      if (data.parent_id) expandFolder(data.parent_id);
      invalidateTree();
    }
  });

  const updateFolderMut = useMutation({
    mutationFn: (args: { id: string; name: string; parent_id?: string | null }) => workspaceApi.updateFolder(args.id, { name: args.name, parent_id: args.parent_id }),
    onMutate: async (args) => {
      updateCacheItem(args.id, args.name, true);
    },
    onSettled: invalidateTree
  });

  const deleteFolderMut = useMutation({
    mutationFn: workspaceApi.deleteFolder,
    onMutate: async (id) => {
      removeCacheItem(id, true);
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
    mutationFn: (args: { id: string; name: string; folder_id?: string | null }) => workspaceApi.updateFile(args.id, { name: args.name, folder_id: args.folder_id }),
    onMutate: async (args) => {
      updateCacheItem(args.id, args.name, false);
      useEditorStore.getState().updateTab(args.id, { name: args.name });
    },
    onSettled: invalidateTree
  });

  const deleteFileMut = useMutation({
    mutationFn: workspaceApi.deleteFile,
    onMutate: async (id) => {
      removeCacheItem(id, false);
      useEditorStore.getState().closeTab(id);
    },
    onSettled: invalidateTree
  });

  const duplicateFileMut = useMutation({
    mutationFn: workspaceApi.duplicateFile,
    onSuccess: invalidateTree
  });


  const handleDropItem = (draggedId: string, type: 'file' | 'folder', targetFolderId: string | null) => {
    if (type === 'file') {
      updateFileMut.mutate({ id: draggedId, name: undefined as any, folder_id: targetFolderId } as any);
    } else {
      if (draggedId === targetFolderId) return;
      updateFolderMut.mutate({ id: draggedId, name: undefined as any, parent_id: targetFolderId } as any);
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
        <Loader2 className="animate-spin mr-2" size={20} />
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
            onClick={() => handleCreateFile(null)} 
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={() => handleCreateFolder(null)} 
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

      <div className="flex-1 overflow-y-auto py-2">
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
          <div className="pb-4">
            {tree?.folders?.map((folder) => (
              <FolderItem onDropItem={handleDropItem}
                key={folder.id}
                folder={folder}
                level={0}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onRenameFile={handleRenameFile}
                onDeleteFile={handleDeleteFile}
                onDuplicateFile={handleDuplicateFile}
              />
            ))}
            {tree?.files?.map((file) => (
              <FileItem onDropItem={handleDropItem}
                key={file.id}
                file={file}
                level={0}
                onRename={handleRenameFile}
                onDelete={handleDeleteFile}
                onDuplicate={handleDuplicateFile}
              />
            ))}
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
