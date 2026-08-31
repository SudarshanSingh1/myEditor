import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../lib/utils';
import type { ContextMenuPosition } from '../../hooks/useExplorerContextMenu';

interface ExplorerContextMenuProps {
  isOpen: boolean;
  position: ContextMenuPosition;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Portal-based context menu for Explorer rows.
 *
 * Rendered directly into document.body via ReactDOM.createPortal so it is
 * completely outside any parent overflow / stacking context. Uses
 * `position: fixed` with coordinates pre-calculated in viewport-space by
 * `useExplorerContextMenu`, which means no overflow clipping or z-index
 * fighting with parent transforms.
 *
 * After mount, the menu re-measures its own rendered size and nudges itself
 * back inside the viewport if the initial estimate was off.
 */
export const ExplorerContextMenu: React.FC<ExplorerContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  children,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Outside-click: close when clicking anywhere outside this menu.
  // We listen on `mousedown` (not `click`) so the handler fires before any
  // onClick handlers in the tree — preventing a race where a button click
  // both opens a new menu and immediately closes it via this handler.
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay by one frame so the same mousedown that opened the menu doesn't
    // immediately fire this and close it again.
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleMouseDown);
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // After render, re-measure and nudge inside viewport if initial estimate was off
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let { left, top } = position;
    if (rect.right > vw - 4) left = vw - rect.width - 4;
    if (left < 4) left = 4;
    if (rect.bottom > vh - 4) top = vh - rect.height - 4;
    if (top < 4) top = 4;

    // Only apply if different from current style (avoid loop)
    if (left !== position.left || top !== position.top) {
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      className={cn(
        // Base structure
        'w-40 rounded-md py-1',
        // Dark editor theme — matches the app's dark bg
        'bg-[#1e1e2e] dark:bg-[#1e1e2e]',
        // Light theme fallback
        'bg-white',
        // Border & shadow for visual separation from Explorer rows
        'border border-gray-200 dark:border-gray-700/80',
        'shadow-xl shadow-black/30',
        // Text
        'text-gray-700 dark:text-gray-200',
        // Subtle entrance animation
        'animate-in fade-in-0 zoom-in-95 duration-100',
        className
      )}
      // Prevent clicks inside the menu from bubbling to outside-click handlers
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

// ─── Menu Item primitives ────────────────────────────────────────────────────

interface ExplorerMenuItemProps {
  icon?: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export const ExplorerMenuItem: React.FC<ExplorerMenuItemProps> = ({
  icon,
  onClick,
  children,
  variant = 'default',
}) => (
  <button
    role="menuitem"
    className={cn(
      'w-full text-left px-3 py-1.5 text-xs flex items-center gap-2',
      'transition-colors duration-75',
      variant === 'destructive'
        ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/25'
        : 'hover:bg-gray-100 dark:hover:bg-gray-700/60'
    )}
    onClick={onClick}
  >
    {icon && <span className="flex-shrink-0 opacity-75">{icon}</span>}
    {children}
  </button>
);

export const ExplorerMenuSeparator: React.FC = () => (
  <div className="my-1 h-px bg-gray-200 dark:bg-gray-700/60" />
);
