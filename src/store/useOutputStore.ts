import { create } from 'zustand';

interface OutputLog {
  id: string;
  timestamp: number;
  message: string;
  source: 'System' | 'Compiler' | 'SaveEngine' | 'Network' | 'Execution';
}

interface OutputState {
  logs: OutputLog[];
  appendLog: (message: string, source?: OutputLog['source']) => void;
  clearLogs: () => void;
}

export const useOutputStore = create<OutputState>((set) => ({
  logs: [],
  
  appendLog: (message, source = 'System') => set((state) => ({
    logs: [
      ...state.logs, 
      { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), message, source }
    ]
  })),

  clearLogs: () => set({ logs: [] }),
}));
