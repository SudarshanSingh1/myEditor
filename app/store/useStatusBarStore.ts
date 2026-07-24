import { create } from 'zustand';

interface StatusBarState {
  language: string;
  encoding: string;
  lineEnding: 'CRLF' | 'LF';
  cursorLine: number;
  cursorColumn: number;
  spacesOrTabs: 'Spaces' | 'Tabs';
  tabSize: number;
  connectionStatus: 'Connected' | 'Disconnected' | 'Reconnecting';
  
  updateCursor: (line: number, column: number) => void;
  updateLanguage: (language: string) => void;
  setConnectionStatus: (status: 'Connected' | 'Disconnected' | 'Reconnecting') => void;
}

export const useStatusBarStore = create<StatusBarState>((set) => ({
  language: 'TypeScript',
  encoding: 'UTF-8',
  lineEnding: 'LF',
  cursorLine: 1,
  cursorColumn: 1,
  spacesOrTabs: 'Spaces',
  tabSize: 2,
  connectionStatus: 'Connected',

  updateCursor: (line, column) => set({ cursorLine: line, cursorColumn: column }),
  updateLanguage: (language) => set({ language }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
