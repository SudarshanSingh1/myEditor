import { create } from 'zustand';
import { fetchApi } from '../lib/api';

interface SystemState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime: string | null;
  allowAdmin: boolean;
  serverTime: string | null;
  isChecking: boolean;
  hasChecked: boolean;
  checkStatus: (force?: boolean) => Promise<void>;
}

// Share the exact same promise for concurrent callers
let _statusPromise: Promise<void> | null = null;

export const useSystemStore = create<SystemState>((set, _get) => ({
  isMaintenanceMode: false,
  maintenanceMessage: "System is under maintenance.",
  maintenanceEndTime: null,
  allowAdmin: true,
  serverTime: null,
  isChecking: true,
  hasChecked: false,
  checkStatus: async (force = false) => {
    if (_statusPromise && !force) return _statusPromise;

    _statusPromise = (async () => {
      try {
        const response = await fetchApi('/system/status');
        if (response?.success && response.data) {
          set({
            isMaintenanceMode: response.data.maintenance_enabled || false,
            maintenanceMessage: response.data.message || "System is under maintenance.",
            maintenanceEndTime: response.data.countdown || null,
            allowAdmin: response.data.allow_admin ?? true,
            serverTime: response.data.server_time || null,
            isChecking: false,
            hasChecked: true
          });
        } else {
          set({ isChecking: false, hasChecked: true });
        }
      } catch {
        // Fail open if the backend is fully down, let AuthGuard handle 503s
        set({ isChecking: false, hasChecked: true });
      } finally {
        _statusPromise = null;
      }
    })();

    return _statusPromise;
  }
}));
