import { create } from 'zustand';

interface DeploymentState {
  isDeploying: boolean;
  isReconnecting: boolean;
  showUpdateComplete: boolean;
  serverVersion: string | null;
  
  setIsDeploying: (status: boolean) => void;
  setIsReconnecting: (status: boolean) => void;
  setShowUpdateComplete: (status: boolean) => void;
  setServerVersion: (version: string) => void;
}

export const useDeploymentStore = create<DeploymentState>((set) => ({
  isDeploying: false,
  isReconnecting: false,
  showUpdateComplete: false,
  serverVersion: null,
  
  setIsDeploying: (status) => set({ isDeploying: status }),
  setIsReconnecting: (status) => set({ isReconnecting: status }),
  setShowUpdateComplete: (status) => set({ showUpdateComplete: status }),
  setServerVersion: (version) => set({ serverVersion: version }),
}));
