import { create } from 'zustand';
import { fetchApi } from '../lib/api';

interface SystemState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isChecking: boolean;
  checkStatus: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  isMaintenanceMode: false,
  maintenanceMessage: "System is under maintenance.",
  isChecking: true,
  checkStatus: async () => {
    try {
      const response = await fetchApi('/status');
      if (response?.success && response.data) {
        set({
          isMaintenanceMode: response.data.maintenance_mode || false,
          maintenanceMessage: response.data.maintenance_message || "System is under maintenance.",
          isChecking: false
        });
      } else {
        set({ isChecking: false });
      }
    } catch {
      // Fail open if the backend is fully down, let the AuthGuard handle the 503s
      set({ isChecking: false });
    }
  }
}));
