import { create } from 'zustand';
import { executionApi } from '../lib/api/execution';
import type { ExecutionResponse } from '../lib/api/execution';
import { useOutputStore } from './useOutputStore';
import { useEditorStore } from './useEditorStore';
import { queryClient } from '../lib/queryClient';
import { useSaveStore } from './useSaveStore';
import { usersApi } from '../lib/api/users';
import confetti from 'canvas-confetti';

export type ExecutionStatus = 
  | 'Ready' 
  | 'Compiling' 
  | 'Running' 
  | 'Cancelling' 
  | 'Completed' 
  | 'Failed' 
  | 'Timeout' 
  | 'Memory Exceeded'
  | 'Cancelled';

export type ErrorCategory = 
  | 'None'
  | 'Compilation Error'
  | 'Runtime Error'
  | 'System Error'
  | 'Timeout'
  | 'Memory Limit';

export interface ExecutionHistoryItem extends ExecutionResponse {
  id: string;
  timestamp: number;
  errorCategory: ErrorCategory;
}

interface ExecutionState {
  isRunning: boolean;
  isCancelling: boolean;
  status: ExecutionStatus;
  activeLanguage: string | null;
  stdin: string;
  history: ExecutionHistoryItem[];
  pendingExecution: { projectId: string; fileId: string; language: string } | null;
  
  setStdin: (input: string) => void;
  runCode: (projectId: string, fileId: string, language: string) => Promise<void>;
  stopCode: () => Promise<void>;
  clearHistory: () => void;
  setStatus: (status: ExecutionStatus) => void;
  setPendingExecution: (exec: { projectId: string; fileId: string; language: string } | null) => void;
  setExecutionFinished: (exitCode: number) => void;
  reset: () => void;
}

const determineErrorCategory = (result: ExecutionResponse): ErrorCategory => {
  if (result.exit_code === 0) return 'None';
  
  const statusLower = result.status.toLowerCase();
  if (statusLower.includes('timeout') || result.exit_code === 137) return 'Timeout';
  if (statusLower.includes('memory') || result.exit_code === 139) return 'Memory Limit';
  if (statusLower.includes('compile') || result.exit_code === 1) return 'Compilation Error';
  if (result.exit_code > 128) return 'System Error';
  return 'Runtime Error';
};

const determineFinalStatus = (category: ErrorCategory, exitCode: number): ExecutionStatus => {
  if (exitCode === 0) return 'Completed';
  if (category === 'Timeout') return 'Timeout';
  if (category === 'Memory Limit') return 'Memory Exceeded';
  return 'Failed';
};

import { persist } from 'zustand/middleware';

export const useExecutionStore = create<ExecutionState>()(
  persist(
    (set, get) => ({
  isRunning: false,
  isCancelling: false,
  status: 'Ready',
  activeLanguage: null,
  stdin: "",
  history: [],
  pendingExecution: null,

  setStdin: (input) => set({ stdin: input }),
  setStatus: (status) => set({ status }),
  setPendingExecution: (exec) => set({ pendingExecution: exec }),
  setExecutionFinished: (exitCode) => {
    const { pendingExecution, history } = get();
    const isSuccess = exitCode === 0;
    
    // Instantly update dashboard data across all charts when execution finishes
    queryClient.invalidateQueries({ queryKey: ['activity-heatmap'] });
    queryClient.invalidateQueries({ queryKey: ['executions-chart'] });
    queryClient.invalidateQueries({ queryKey: ['execution-summary-today'] });
    queryClient.invalidateQueries({ queryKey: ['execution-summary-total'] });
    
    if (pendingExecution) {
      const newHistoryItem: ExecutionHistoryItem = {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        errorCategory: isSuccess ? 'None' : 'Runtime Error',
        status: isSuccess ? 'Completed' : 'Failed',
        exit_code: exitCode,
        output: '',
        language: pendingExecution.language,
        compile_time_ms: 0,
        execution_time_ms: 0,
        memory_used_kb: 0
      };
      if (isSuccess) {
        const todayDate = new Date();
        const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
        
        usersApi.recordActivity(todayStr).then((res) => {
          if (res && res.count === 1) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
              const timeLeft = animationEnd - Date.now();
              if (timeLeft <= 0) {
                return clearInterval(interval);
              }
              const particleCount = 50 * (timeLeft / duration);
              confetti(Object.assign({}, defaults, { particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
              }));
              confetti(Object.assign({}, defaults, { particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
              }));
            }, 250);
          }
        }).catch(console.error);
      }

      // Keep only last 20 items
      const newHistory = [newHistoryItem, ...history].slice(0, 20);
      set({ isRunning: false, isCancelling: false, status: isSuccess ? 'Completed' : 'Failed', history: newHistory });
    } else {
      set({ isRunning: false, isCancelling: false, status: isSuccess ? 'Completed' : 'Failed' });
    }
  },
  reset: () => set({
    isRunning: false,
    isCancelling: false,
    status: 'Ready',
    activeLanguage: null,
    stdin: "",
    history: [],
    pendingExecution: null
  }),

  runCode: async (projectId: string, fileId: string, language: string) => {
    // Prevent double execution
    if (get().isRunning) return;
    
    // Auto-save before run for real projects
    const editorState = useEditorStore.getState();
    const isVirtual = projectId.startsWith('guest-') || !editorState.projectId;
    const isDirty = editorState.dirtyFiles[fileId];
    
    if (isDirty && !isVirtual) {
      const content = editorState.localContents[fileId];
      if (content !== undefined) {
         const { saveFile } = useSaveStore.getState();
         const success = await saveFile(fileId, content);
         if (!success) {
           useOutputStore.getState().appendLog(`[System Error] Execution aborted. Save failed before running.`, 'System');
           return;
         }
      }
    }
    
    set({ 
      isRunning: true, 
      isCancelling: false, 
      status: 'Compiling', 
      activeLanguage: language, 
      pendingExecution: { projectId, fileId, language } 
    });
    
    // The actual WebSocket connection is managed by ExecutionTerminal.tsx
  },

  stopCode: async () => {
    const { isRunning, isCancelling } = get();
    // Prevent double stop or stopping when not running
    if (!isRunning || isCancelling) return;

    set({ isCancelling: true, status: 'Cancelling' });
    
    const { appendLog } = useOutputStore.getState();
    appendLog('[System] Stop signal dispatched. Terminating container...', 'System');
    
    try {
      // Normally we'd pass the container_id, but the backend doesn't return it until done currently.
      // A robust implementation would return container_id immediately and use WebSockets.
      await executionApi.stop("current"); // Dummy ID for now
    } catch (error) {
      // Ignore stop errors if container already died
    }
  },

  clearHistory: () => set({ history: [] })
    }),
    {
      name: 'hamara-execution-storage',
      partialize: (state) => ({ stdin: state.stdin, history: state.history.slice(-20) }),
    }
  )
);
