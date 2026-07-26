import React, { useState } from 'react';

import type { FileNode } from '../../lib/api/workspace';

import { useEditorStore } from '../../stores/useEditorStore';

import { FileIcon, MoreVertical, Edit2, Trash2, Copy, FileJson, FileCode2, FileText, Terminal, Database, Image as ImageIcon } from 'lucide-react';
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

export const FileItem: React.FC<FileItemProps> = React.memo(({ file, level, onRename, onDelete, onDuplicate, _onDropItem }) => {
  const activeFileId = useEditorStore(state => state.activeFileId);
  const openTab = useEditorStore(state => state.openTab);
  const isDirty = useEditorStore(state => state.dirtyFiles[file.id]);
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setShowMenu(false));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleClick = (_e: React.MouseEvent) => {
    // Single click opens in preview mode
    openTab({ id: file.id, name: file.name, language: file.language }, true);
  };

  const handleDoubleClick = (_e: React.MouseEvent) => {
    // Double click opens/pins the tab permanently
    openTab({ id: file.id, name: file.name, language: file.language }, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openTab({ id: file.id, name: file.name, language: file.language }, false);
    } else if (e.key === 'F2') {
      e.preventDefault();
      onRename(file);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(file);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = (filename || '').split('.').pop()?.toLowerCase();
    switch(ext) {
      case 'ts':
      case 'tsx':
        return <FileCode2 size={14} className="mr-2 flex-shrink-0 text-blue-500" />;
      case 'js':
      case 'jsx':
        return <FileCode2 size={14} className="mr-2 flex-shrink-0 text-yellow-400" />;
      case 'json':
        return <FileJson size={14} className="mr-2 flex-shrink-0 text-green-500" />;
      case 'html':
        return <FileCode2 size={14} className="mr-2 flex-shrink-0 text-orange-500" />;
      case 'css':
        return <FileCode2 size={14} className="mr-2 flex-shrink-0 text-blue-400" />;
      case 'py':
        return <FileCode2 size={14} className="mr-2 flex-shrink-0 text-yellow-500" />;
      case 'c':
      case 'cpp':
        return <FileCode2 size={14} className="mr-2 flex-shrink-0 text-indigo-500" />;
      case 'md':
      case 'txt':
        return <FileText size={14} className="mr-2 flex-shrink-0 text-gray-400" />;
      case 'sh':
      case 'bash':
        return <Terminal size={14} className="mr-2 flex-shrink-0 text-green-400" />;
      case 'sql':
        return <Database size={14} className="mr-2 flex-shrink-0 text-pink-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return <ImageIcon size={14} className="mr-2 flex-shrink-0 text-purple-400" />;
      default:
        return <FileIcon size={14} className="mr-2 flex-shrink-0 opacity-70" />;
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
          activeFileId === file.id ? "bg-primary/20 text-primary font-medium dark:bg-primary/30" : "text-gray-600 dark:text-gray-300",
          isDirty && "text-amber-600 dark:text-amber-400"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex items-center overflow-hidden">
          {getFileIcon(file.name)}
          <span className={cn("truncate", isDirty && "text-amber-600 dark:text-amber-400")}>{file.name}</span>
        </div>

        <div className="flex items-center space-x-1">
          {isDirty && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1 rounded flex-shrink-0">
              M
            </span>
          )}
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
