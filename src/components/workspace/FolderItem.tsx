import React, { useState } from 'react';
import type { FolderTree, FileNode } from '../../lib/api/workspace';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Folder as FolderIcon, FolderOpen, ChevronRight, ChevronDown, MoreVertical, Edit2, Trash2, FilePlus, FolderPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileItem } from './FileItem';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

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
  onDropItem?: (id: string, type: "file" | "folder", targetId: string | null) => void;
}

export const FolderItem: React.FC<FolderItemProps> = React.memo(({
  folder,
  level,
  onRenameFolder,
  onDeleteFolder,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
  onDropItem
}) => {
  const expandedFolders = useWorkspaceStore(state => state.expandedFolders);
  const toggleFolder = useWorkspaceStore(state => state.toggleFolder);
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setShowMenu(false));

  const isExpanded = expandedFolders.has(folder.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolder(folder.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
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
    <div className="select-none"
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("application/json", JSON.stringify({ id: folder.id, type: "folder" }));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/json"));
          if (onDropItem) onDropItem(data.id, data.type, folder.id);
        } catch(err) {}
      }}>
      <div className="relative group" ref={containerRef}>
        <div
          className={cn(
            "flex items-center justify-between px-2 py-1 cursor-pointer text-sm font-medium outline-none focus:bg-primary/10",
            "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-foreground"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="flex items-center overflow-hidden">
            <span className="mr-1 opacity-60">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            {isExpanded ? (
              <FolderOpen size={14} className="mr-2 text-blue-500 flex-shrink-0" />
            ) : (
              <FolderIcon size={14} className="mr-2 text-blue-500 flex-shrink-0" />
            )}
            <span className="truncate">{folder.name}</span>
          </div>

          <button 
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {showMenu && (
          <div 
            className="absolute right-2 top-6 z-50 w-40 bg-popover text-popover-foreground rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button 
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onCreateFile(folder.id); }}
            >
              <FilePlus size={12} className="mr-2" /> New File
            </button>
            <button 
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onCreateFolder(folder.id); }}
            >
              <FolderPlus size={12} className="mr-2" /> New Folder
            </button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <button 
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRenameFolder(folder); }}
            >
              <Edit2 size={12} className="mr-2" /> Rename
            </button>
            <button 
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDeleteFolder(folder); }}
            >
              <Trash2 size={12} className="mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div>
          {/* Render child folders */}
          {folder.children?.map(childFolder => (
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
            />
          ))}
          {/* Render files in this folder */}
          {folder.files?.map(childFile => (
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
});
