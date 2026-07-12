import React from 'react';
import { useExecutionStore } from '../../../store/useExecutionStore';

export const InputPanel: React.FC = () => {
  const { stdin, setStdin } = useExecutionStore();

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Input (stdin)</span>
      </div>
      
      <div className="flex-1 p-2">
        <textarea
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          className="w-full h-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm text-gray-800 dark:text-gray-300 font-mono placeholder-gray-400 dark:placeholder-gray-600"
          placeholder="Enter input here for your program..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};
