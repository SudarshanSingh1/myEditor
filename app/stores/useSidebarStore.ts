import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  
  isRightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (isOpen: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      setSidebarOpen: (isOpen) => set({ isOpen }),
      
      isRightPanelOpen: false,
      toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      setRightPanelOpen: (isRightPanelOpen) => set({ isRightPanelOpen }),
    }),
    {
      name: 'sidebar-storage', // name of item in the storage (must be unique)
      partialize: (state) => ({ isOpen: state.isOpen, isRightPanelOpen: state.isRightPanelOpen }), // Only persist these fields if needed, or omit for all
    }
  )
);
