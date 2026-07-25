import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProblemsPanel } from './panels/ProblemsPanel';
import { TerminalPanel } from './panels/TerminalPanel';
import { useProblemsStore } from '../../store/useProblemsStore';

type Tab = 'PROBLEMS' | 'OUTPUT' | 'INPUT' | 'EXECUTION' | 'TERMINAL';

interface BottomPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT_PERCENT = 0.6; // 60% of window height

export const BottomPanel: React.FC<BottomPanelProps> = ({ projectId, isOpen, onClose, activeTab, setActiveTab }) => {
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return 250;
    const saved = localStorage.getItem('ide_bottom_panel_height');
    return saved ? parseInt(saved, 10) : 250;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const { problems } = useProblemsStore();
  const errorCount = problems.filter(p => p.severity === 'Error').length;
  const warningCount = problems.filter(p => p.severity === 'Warning').length;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new height from bottom of screen
    const windowHeight = window.innerHeight;
    const newHeight = windowHeight - e.clientY - 24; // 24px is the status bar height approx
    
    if (newHeight >= MIN_HEIGHT && newHeight <= windowHeight * MAX_HEIGHT_PERCENT) {
      setHeight(newHeight);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('ide_bottom_panel_height', height.toString());
    }
  }, [isDragging, height]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      // Disable text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Remove the if (!isOpen) return null;
  const tabs: { id: Tab; label: React.ReactNode }[] = [
    { 
      id: 'PROBLEMS', 
      label: (
        <div className="flex items-center">
          Problems
          {(errorCount > 0 || warningCount > 0) && (
            <span className="ml-2 flex space-x-1 items-center">
              {errorCount > 0 && <span className="text-red-500 w-4 h-4 flex items-center justify-center bg-red-500/10 rounded-full text-[10px]">{errorCount}</span>}
              {warningCount > 0 && <span className="text-amber-500 w-4 h-4 flex items-center justify-center bg-amber-500/10 rounded-full text-[10px]">{warningCount}</span>}
            </span>
          )}
        </div>
      )
    },
    { id: 'TERMINAL', label: 'Terminal' },
  ];

  return (
    <div 
      ref={panelRef}
      className={cn(
        "flex flex-col bg-background border-t border-border z-40 relative flex-shrink-0 transition-[height]",
        !isOpen ? "duration-200 ease-in-out" : ""
      )}
      style={{ height: isOpen ? `${height}px` : '36px' }}
    >
      {/* Resizer Handle */}
      {isOpen && (
        <div 
          className="absolute -top-1 left-0 right-0 h-3 cursor-row-resize hover:bg-primary/50 z-50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Panel Header */}
      <div 
        className="flex items-center justify-between px-2 h-9 border-b border-border bg-gray-50/80 dark:bg-muted select-none"
        onDoubleClick={() => {
          if (!isOpen) {
            onClose(); // In reality, this means toggle open
          } else {
            onClose(); // toggle close
          }
        }}
      >
        <div className="flex space-x-4 h-full">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "h-full px-2 text-[11px] font-medium uppercase tracking-wider transition-colors relative",
                activeTab === tab.id 
                  ? "text-foreground" 
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1">
          <button 
            onClick={() => {
              if (!isOpen) {
                // If opening, just trigger onClose (which acts as toggle)
                onClose();
              } else if (height < window.innerHeight * MAX_HEIGHT_PERCENT - 10) {
                setHeight(window.innerHeight * MAX_HEIGHT_PERCENT);
              } else {
                setHeight(250);
              }
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#3c3c3c] text-gray-500"
          >
            {height >= window.innerHeight * MAX_HEIGHT_PERCENT - 10 ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#3c3c3c] text-gray-500"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className={cn("flex-1 overflow-hidden", !isOpen && "hidden")}>
        {activeTab === 'PROBLEMS' && <ProblemsPanel />}
        {activeTab === 'TERMINAL' && <TerminalPanel projectId={projectId} />}
      </div>
    </div>
  );
};
