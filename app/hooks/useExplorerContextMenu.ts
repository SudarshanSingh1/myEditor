import { useState, useCallback, useRef, useEffect } from 'react';

export interface ContextMenuPosition {
  top: number;
  left: number;
}

export interface ExplorerContextMenuState {
  isOpen: boolean;
  position: ContextMenuPosition;
  /** Ref to attach to the ⋮ trigger button */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: (e: React.MouseEvent) => void;
  close: () => void;
}

/**
 * Manages state for an Explorer row context menu.
 *
 * Position is calculated in viewport-space via getBoundingClientRect so the
 * menu can be rendered with `position: fixed` inside a portal, completely
 * escaping any parent overflow / stacking context.
 *
 * @param scrollContainerRef - Ref to the Explorer's scrollable container.
 *   When the container scrolls while the menu is open, the menu closes.
 */
export function useExplorerContextMenu(
  scrollContainerRef?: React.RefObject<HTMLElement | null>
): ExplorerContextMenuState {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const button = triggerRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();

    // Estimated menu dimensions — used for viewport boundary detection.
    // The real menu measures itself after render via the portal, but we need
    // an initial position before it mounts. These are conservative estimates.
    const MENU_WIDTH = 160;
    const MENU_HEIGHT = 120; // rough max for file menu; folder menu is ~160

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: default to right-aligned with the button; flip left if needed
    let left = rect.right - MENU_WIDTH;
    if (left < 4) left = rect.left; // near left edge — open rightward instead
    if (left + MENU_WIDTH > vw - 4) left = vw - MENU_WIDTH - 4; // clamp right

    // Vertical: open below the button row; flip up if not enough space
    let top = rect.bottom + 2;
    if (top + MENU_HEIGHT > vh - 4) {
      // Not enough space below — open above instead
      top = rect.top - MENU_HEIGHT - 2;
      if (top < 4) top = 4; // final clamp so it never goes off-screen top
    }

    setPosition({ top, left });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close menu when the Explorer scroll container scrolls (row moves under the menu)
  useEffect(() => {
    if (!isOpen) return;
    const container = scrollContainerRef?.current;
    if (!container) return;

    const onScroll = () => close();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [isOpen, scrollContainerRef, close]);

  return { isOpen, position, triggerRef, open, close };
}
