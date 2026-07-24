import React, { useState, useMemo } from 'react';
import { useExecutionStore } from '../../../store/useExecutionStore';
import { useOutputStore } from '../../../store/useOutputStore';
import { Clock, HardDrive, AlertCircle, CheckCircle2, Search, Filter, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const ExecutionPanel: React.FC = () => {
  const { history, clearHistory } = useExecutionStore();
  const { appendLog, clearLogs } = useOutputStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredHistory = useMemo(() => {
    return history.filter((exec) => {
      const matchesSearch = exec.language.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            exec.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (exec.errorCategory && exec.errorCategory.toLowerCase().includes(searchTerm.toLowerCase()));
                            
      const matchesStatus = statusFilter === 'ALL' || 
                            (statusFilter === 'SUCCESS' && exec.exit_code === 0) || 
                            (statusFilter === 'ERROR' && exec.exit_code !== 0);
                            
      return matchesSearch && matchesStatus;
    });
  }, [history, searchTerm, statusFilter]);

  const handleReopenOutput = (exec: any) => {
    clearLogs();
    appendLog(`[System] Reopening previous execution output from ${new Date(exec.timestamp).toLocaleTimeString()}`, 'System');
    if (exec.output) {
      appendLog(exec.output, 'Execution');
    } else {
      appendLog('[System] No standard output recorded for this execution.', 'System');
    }
  };

  const getErrorBadgeColors = (category: string, exitCode: number) => {
    if (exitCode === 0) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (category === 'Timeout') return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    if (category === 'Compilation Error') return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted">
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded px-7 py-0.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-background border border-border rounded pl-2 pr-6 py-0.5 text-xs focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="ERROR">Errors</option>
            </select>
            <Filter className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <button 
          onClick={clearHistory}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-4 flex items-center space-x-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="text-sm text-gray-400 italic flex items-center justify-center h-full">
            No execution history found.
          </div>
        ) : (
          filteredHistory.map((exec) => (
            <div 
              key={exec.id} 
              className="border border-border rounded p-3 bg-gray-50/30 dark:bg-muted hover:bg-gray-100/50 dark:hover:bg-[#2a2a2b] transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {exec.exit_code === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                    {exec.language}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(exec.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleReopenOutput(exec)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center space-x-1 text-primary hover:text-primary/80 mr-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>View Output</span>
                  </button>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase",
                    getErrorBadgeColors(exec.errorCategory, exec.exit_code)
                  )}>
                    {exec.exit_code === 0 ? 'Success' : exec.errorCategory} (Code: {exec.exit_code})
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  <span>Time: {exec.execution_time_ms}ms</span>
                </div>
                {exec.memory_used_kb > 0 && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <HardDrive className="w-3.5 h-3.5 mr-1.5" />
                    <span>Memory: {(exec.memory_used_kb / 1024).toFixed(1)}MB</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
