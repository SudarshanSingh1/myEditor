import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  editor: {
    fontSize: number;
    wordWrap: boolean;
    minimap: boolean;
    formatOnSave: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    projectInvites: boolean;
  };
  updateEditorSettings: (settings: Partial<SettingsState['editor']>) => void;
  updateNotificationSettings: (settings: Partial<SettingsState['notifications']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editor: {
        fontSize: 14,
        wordWrap: true,
        minimap: true,
        formatOnSave: true,
      },
      notifications: {
        emailAlerts: true,
        projectInvites: true,
      },
      updateEditorSettings: (settings) => set((state) => ({ 
        editor: { ...state.editor, ...settings } 
      })),
      updateNotificationSettings: (settings) => set((state) => ({ 
        notifications: { ...state.notifications, ...settings } 
      })),
    }),
    {
      name: 'hamara-settings-storage',
    }
  )
);

