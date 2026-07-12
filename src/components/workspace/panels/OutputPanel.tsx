import React, { useRef, useEffect } from 'react';
import { useOutputStore } from '../../../store/useOutputStore';
import { Trash2, Copy, Download } from 'lucide-react';

export const OutputPanel: React.FC = () => {
  const { logs, clearLogs } = useOutputStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = React.useState(false);

  // Handle scroll events to detect if user scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // If we're within 20px of the bottom, consider it "at bottom"
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;
    setIsScrolledUp(!atBottom);
  };

  // Auto-scroll
  useEffect(() => {
    if (!isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isScrolledUp]);

  const handleCopy = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.source}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.source}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.log';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-end px-4 py-1 border-b border-border bg-muted">
        <div className="flex items-center space-x-2">
          <button onClick={handleCopy} className="p-1 hover:bg-gray-200 dark:hover:bg-[#3c3c3c] rounded text-gray-500 dark:text-gray-400" title="Copy All">
            <Copy size={14} />
          </button>
          <button onClick={handleDownload} className="p-1 hover:bg-gray-200 dark:hover:bg-[#3c3c3c] rounded text-gray-500 dark:text-gray-400" title="Download Logs">
            <Download size={14} />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-[#3c3c3c]" />
          <button onClick={clearLogs} className="p-1 hover:bg-gray-200 dark:hover:bg-[#3c3c3c] rounded text-gray-500 dark:text-gray-400" title="Clear Output">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed select-text relative"
      >
        {isScrolledUp && (
          <div className="sticky top-0 right-0 z-10 flex justify-center mt-2 pointer-events-none">
            <button 
              onClick={() => {
                setIsScrolledUp(false);
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="pointer-events-auto flex items-center space-x-2 bg-gray-800/90 hover:bg-gray-700/90 text-white dark:bg-gray-700/90 dark:hover:bg-gray-600/90 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-colors"
            >
              <span>Scroll to bottom</span>
            </button>
          </div>
        )}
        {logs.length === 0 ? (
          <div className="text-gray-400 italic">No output to display.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex space-x-3 hover:bg-gray-50 dark:hover:bg-[#2a2d2e] rounded px-2 py-0.5">
              <span className="text-gray-400 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-blue-500 shrink-0 select-none w-20">[{log.source}]</span>
              <span className="text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-words flex-1 font-mono">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
};
