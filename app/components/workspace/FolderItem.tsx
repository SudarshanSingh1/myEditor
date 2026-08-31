import React from 'react';
import type { FolderTree, FileNode } from '../../lib/api/workspace';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileItem } from './FileItem';
import { useExplorerContextMenu } from '../../hooks/useExplorerContextMenu';
import {
  ExplorerContextMenu,
  ExplorerMenuItem,
  ExplorerMenuSeparator,
} from './ExplorerContextMenu';

interface FolderItemProps {
  folder: FolderTree;
  level: number;
  onRenameFolder: (folder: FolderTree) => void;
  onDeleteFolder: (folder: FolderTree) => void;
  onCreateFile: (folderId: string | null) => void;
  onCreateFolder: (folderId: string | null) => void;
  onRenameFile: (file: FileNode) => void;
  onDeleteFile: (file: FileNode) => void;
  onDuplicateFile: (file: FileNode) => void;
  onDropItem?: (id: string, type: 'file' | 'folder', targetId: string | null) => void;
}

export const FolderItem: React.FC<FolderItemProps> = React.memo(
  ({
    folder,
    level,
    onRenameFolder,
    onDeleteFolder,
    onCreateFile,
    onCreateFolder,
    onRenameFile,
    onDeleteFile,
    onDuplicateFile,
    onDropItem,
  }) => {
    const isExpanded = useWorkspaceStore((state) => !!state.expandedFolders[folder.id]);
    const toggleFolder = useWorkspaceStore((state) => state.toggleFolder);
    const activeFolderId = useWorkspaceStore((state) => state.activeFolderId);
    const setActiveFolder = useWorkspaceStore((state) => state.setActiveFolder);

    // Portal-based context menu — same pattern as FileItem
    const { isOpen: menuOpen, position, triggerRef, open: openMenu, close: closeMenu } =
      useExplorerContextMenu();

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveFolder(folder.id);
      toggleFolder(folder.id);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (triggerRef.current) {
        openMenu({ ...e, currentTarget: triggerRef.current } as React.MouseEvent);
      } else {
        openMenu(e);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setActiveFolder(folder.id);
        toggleFolder(folder.id);
      } else if (e.key === 'F2') {
        e.preventDefault();
        onRenameFolder(folder);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteFolder(folder);
      }
    };

    return (
      <div
        className="select-none"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify({ id: folder.id, type: 'folder' })
          );
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (onDropItem) onDropItem(data.id, data.type, folder.id);
          } catch {}
        }}
      >
        {/* ── Folder row ────────────────────────────────────────────────────── */}
        <div className="relative group">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 cursor-pointer text-sm font-medium outline-none',
              'hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20',
              activeFolderId === folder.id
                ? 'bg-primary/20 text-primary dark:bg-primary/30'
                : 'text-foreground'
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Left section: chevron + folder icon + name — truncates */}
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              <span className="opacity-60 flex-shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              {isExpanded ? (
                <FolderOpen size={14} className="flex-shrink-0 text-blue-500" />
              ) : (
                <FolderIcon size={14} className="flex-shrink-0 text-blue-500" />
              )}
              <span className="truncate">{folder.name}</span>
            </div>

            {/* Right section: 3-dot button — never shrinks */}
            <div className="flex-shrink-0 ml-1">
              <button
                ref={triggerRef}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={`More actions for ${folder.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={openMenu}
              >
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* ── Context menu (portal) ──────────────────────────────────────── */}
          <ExplorerContextMenu isOpen={menuOpen} position={position} onClose={closeMenu}>
            <ExplorerMenuItem
              icon={<FilePlus size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                onCreateFile(folder.id);
              }}
            >
              New File
            </ExplorerMenuItem>

            <ExplorerMenuItem
              icon={<FolderPlus size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                onCreateFolder(folder.id);
              }}
            >
              New Folder
            </ExplorerMenuItem>

            <ExplorerMenuSeparator />

            <ExplorerMenuItem
              icon={<Edit2 size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                onRenameFolder(folder);
              }}
            >
              Rename
            </ExplorerMenuItem>

            <ExplorerMenuSeparator />

            <ExplorerMenuItem
              icon={<Trash2 size={12} />}
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                onDeleteFolder(folder);
              }}
            >
              Delete
            </ExplorerMenuItem>
          </ExplorerContextMenu>
        </div>

        {/* ── Children (expanded) ───────────────────────────────────────────── */}
        {isExpanded && (
          <div>
            {folder.children?.map((childFolder) => (
              <FolderItem
                key={childFolder.id}
                folder={childFolder}
                level={level + 1}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                onDuplicateFile={onDuplicateFile}
                onDropItem={onDropItem}
              />
            ))}
            {folder.files?.map((childFile) => (
              <FileItem
                key={childFile.id}
                file={childFile}
                level={level + 1}
                onRename={onRenameFile}
                onDelete={onDeleteFile}
                onDuplicate={onDuplicateFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

FolderItem.displayName = 'FolderItem';
