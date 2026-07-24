import { create } from 'zustand';

export interface Problem {
  id: string;
  severity: 'Error' | 'Warning' | 'Info';
  message: string;
  fileId: string;
  fileName: string;
  line: number;
  column: number;
  timestamp: number;
}

interface ProblemsState {
  problems: Problem[];
  addProblem: (problem: Omit<Problem, 'id' | 'timestamp'>) => void;
  removeProblem: (id: string) => void;
  clearProblems: (fileId?: string) => void;
}

export const useProblemsStore = create<ProblemsState>((set) => ({
  problems: [],
  
  addProblem: (problem) => set((state) => ({
    problems: [
      ...state.problems, 
      { 
        ...problem, 
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      }
    ]
  })),

  removeProblem: (id) => set((state) => ({
    problems: state.problems.filter(p => p.id !== id)
  })),

  clearProblems: (fileId) => set((state) => ({
    problems: fileId ? state.problems.filter(p => p.fileId !== fileId) : []
  })),
}));
