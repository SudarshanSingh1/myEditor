import { create } from 'zustand';
import { fetchApi } from '../lib/api';

interface SystemState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime: string | null;
  serverTime: string | null;
  isChecking: boolean;
  hasChecked: boolean;
  checkStatus: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  isMaintenanceMode: false,
  maintenanceMessage: "System is under maintenance.",
  maintenanceEndTime: null,
  serverTime: null,
  isChecking: true,
  hasChecked: false,
  checkStatus: async () => {
    try {
      const response = await fetchApi('/system/status');
      if (response?.success && response.data) {
        set({
          isMaintenanceMode: response.data.maintenance_enabled || false,
          maintenanceMessage: response.data.message || "System is under maintenance.",
          maintenanceEndTime: response.data.countdown || null,
          serverTime: response.data.server_time || null,
          isChecking: false,
          hasChecked: true
        });
      } else {
        set({ isChecking: false, hasChecked: true });
      }
    } catch {
      // Fail open if the backend is fully down, let the AuthGuard handle the 503s
      set({ isChecking: false, hasChecked: true });
    }
  }
}));
