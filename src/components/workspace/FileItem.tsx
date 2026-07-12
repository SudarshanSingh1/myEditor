import React, { useState } from 'react';
import type { FileNode } from '../../lib/api/workspace';
import { useEditorStore } from '../../store/useEditorStore';
import { FileIcon, MoreVertical, Edit2, Trash2, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface FileItemProps {
  file: FileNode;
  level: number;
  onRename: (file: FileNode) => void;
  onDelete: (file: FileNode) => void;
  onDuplicate: (file: FileNode) => void;
  onDropItem?: (id: string, type: "file" | "folder", targetId: string | null) => void;
}

export const FileItem: React.FC<FileItemProps> = React.memo(({ file, level, onRename, onDelete, onDuplicate, onDropItem }) => {
  const activeFileId = useEditorStore(state => state.activeFileId);
  const openTab = useEditorStore(state => state.openTab);
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setShowMenu(false));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleClick = () => {
    openTab({ id: file.id, name: file.name, language: file.language });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'F2') {
      e.preventDefault();
      onRename(file);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(file);
    }
  };

  return (
    <div className="relative group"
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("application/json", JSON.stringify({ id: file.id, type: "file" }));
      }} ref={containerRef}>
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1 cursor-pointer text-sm select-none outline-none focus:bg-primary/10",
          "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20",
          activeFileId === file.id ? "bg-primary/20 text-primary font-medium dark:bg-primary/30" : "text-gray-600 dark:text-gray-300"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex items-center overflow-hidden">
          <FileIcon size={14} className="mr-2 flex-shrink-0 opacity-70" />
          <span className="truncate">{file.name}</span>
        </div>

        {/* Action button - visible on hover */}
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

      {/* Basic Inline Menu for simplicity - alternatively use a Portal for absolute screen coords */}
      {showMenu && (
        <div 
          className="absolute right-2 top-6 z-50 w-36 bg-popover text-popover-foreground rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
        >
          <button 
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRename(file); }}
          >
            <Edit2 size={12} className="mr-2" /> Rename
          </button>
          <button 
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDuplicate(file); }}
          >
            <Copy size={12} className="mr-2" /> Duplicate
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <button 
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(file); }}
          >
            <Trash2 size={12} className="mr-2" /> Delete
          </button>
        </div>
      )}
    </div>
  );
});
