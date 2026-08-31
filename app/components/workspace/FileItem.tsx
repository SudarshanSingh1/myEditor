import React from 'react';

import type { FileNode } from '../../lib/api/workspace';

import { useEditorStore } from '../../stores/useEditorStore';

import {
  FileIcon,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  FileJson,
  FileCode2,
  FileText,
  Terminal,
  Database,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';

import { useExplorerContextMenu } from '../../hooks/useExplorerContextMenu';
import {
  ExplorerContextMenu,
  ExplorerMenuItem,
  ExplorerMenuSeparator,
} from './ExplorerContextMenu';

interface FileItemProps {
  file: FileNode;
  level: number;
  onRename: (file: FileNode) => void;
  onDelete: (file: FileNode) => void;
  onDuplicate: (file: FileNode) => void;
  onDropItem?: (id: string, type: 'file' | 'folder', targetId: string | null) => void;
}

const getFileIcon = (filename: string) => {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode2 size={14} className="flex-shrink-0 text-blue-500" />;
    case 'js':
    case 'jsx':
      return <FileCode2 size={14} className="flex-shrink-0 text-yellow-400" />;
    case 'json':
      return <FileJson size={14} className="flex-shrink-0 text-green-500" />;
    case 'html':
      return <FileCode2 size={14} className="flex-shrink-0 text-orange-500" />;
    case 'css':
      return <FileCode2 size={14} className="flex-shrink-0 text-blue-400" />;
    case 'py':
      return <FileCode2 size={14} className="flex-shrink-0 text-yellow-500" />;
    case 'c':
    case 'cpp':
      return <FileCode2 size={14} className="flex-shrink-0 text-indigo-500" />;
    case 'md':
    case 'txt':
      return <FileText size={14} className="flex-shrink-0 text-gray-400" />;
    case 'sh':
    case 'bash':
      return <Terminal size={14} className="flex-shrink-0 text-green-400" />;
    case 'sql':
      return <Database size={14} className="flex-shrink-0 text-pink-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return <ImageIcon size={14} className="flex-shrink-0 text-purple-400" />;
    default:
      return <FileIcon size={14} className="flex-shrink-0 opacity-70" />;
  }
};

export const FileItem: React.FC<FileItemProps> = React.memo(
  ({ file, level, onRename, onDelete, onDuplicate, onDropItem: _onDropItem }) => {
    const activeFileId = useEditorStore((state) => state.activeFileId);
    const openTab = useEditorStore((state) => state.openTab);
    const isDirty = useEditorStore((state) => state.dirtyFiles[file.id]);

    // Portal-based context menu — position is calculated in viewport-space
    // so it is never clipped by the Explorer's overflow:auto container.
    const { isOpen: menuOpen, position, triggerRef, open: openMenu, close: closeMenu } =
      useExplorerContextMenu();

    const handleClick = () => {
      // Single click: open in preview mode
      openTab({ id: file.id, name: file.name, language: file.language }, true);
    };

    const handleDoubleClick = () => {
      // Double click: pin the tab
      openTab({ id: file.id, name: file.name, language: file.language }, false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      // Synthesise a click event anchored to the 3-dot button so the portal
      // can compute the correct position even when triggered by right-click.
      if (triggerRef.current) {
        openMenu({ ...e, currentTarget: triggerRef.current } as React.MouseEvent);
      } else {
        openMenu(e);
      }
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

    return (
      // `relative group` is kept for the hover-reveal pattern on the 3-dot button.
      // The menu itself is NOT inside this div — it renders in a portal.
      <div
        className="relative group"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify({ id: file.id, type: 'file' })
          );
        }}
      >
        {/* ── Row ───────────────────────────────────────────────────────────────
            Layout: [left-section: icon + name] [right-section: dirty badge + ⋮]

            The left section has `flex-1 min-w-0 overflow-hidden` so the filename
            truncates rather than pushing the action buttons off-screen.
            The right section has `flex-shrink-0` so it always stays visible.
        ─────────────────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 cursor-pointer text-sm select-none outline-none',
            'focus:bg-primary/10',
            'hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20',
            activeFileId === file.id
              ? 'bg-primary/20 text-primary font-medium dark:bg-primary/30'
              : 'text-gray-600 dark:text-gray-300',
            isDirty && 'text-amber-600 dark:text-amber-400'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Left section: icon + filename — truncates with ellipsis */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
            {getFileIcon(file.name)}
            <span
              className={cn(
                'truncate',
                isDirty && 'text-amber-600 dark:text-amber-400'
              )}
            >
              {file.name}
            </span>
          </div>

          {/* Right section: dirty badge + 3-dot button — never shrinks */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            {isDirty && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1 rounded leading-none py-0.5">
                M
              </span>
            )}

            {/* 3-dot button — gets a ref so the portal can anchor its position */}
            <button
              ref={triggerRef}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={`More actions for ${file.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={openMenu}
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        {/* ── Context menu (portal) ─────────────────────────────────────────── */}
        <ExplorerContextMenu isOpen={menuOpen} position={position} onClose={closeMenu}>
          <ExplorerMenuItem
            icon={<Edit2 size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              onRename(file);
            }}
          >
            Rename
          </ExplorerMenuItem>

          <ExplorerMenuItem
            icon={<Copy size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              onDuplicate(file);
            }}
          >
            Duplicate
          </ExplorerMenuItem>

          <ExplorerMenuSeparator />

          <ExplorerMenuItem
            icon={<Trash2 size={12} />}
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              onDelete(file);
            }}
          >
            Delete
          </ExplorerMenuItem>
        </ExplorerContextMenu>
      </div>
    );
  }
);

FileItem.displayName = 'FileItem';
