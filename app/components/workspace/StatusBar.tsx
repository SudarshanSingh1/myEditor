import React from 'react';

import { useStatusBarStore } from '../../stores/useStatusBarStore';

import { useSaveStore } from '../../stores/useSaveStore';

import { useEditorStore } from '../../stores/useEditorStore';

import { useExecutionStore } from '../../stores/useExecutionStore';

import { useUserStore } from '../../stores/useUserStore';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { SudarshanaMandala } from '../ui/SplashLoader';
import { cn } from '../../lib/utils';

export const StatusBar: React.FC = () => {
  const { 
    language, encoding, lineEnding, cursorLine, cursorColumn, 
    spacesOrTabs, tabSize, connectionStatus 
  } = useStatusBarStore();
  
  const _isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const _guestQuota = useUserStore((state) => state.guestQuota);
  
  const activeFileId = useEditorStore((state) => state.activeFileId);
  const activeStatus = useSaveStore((state) => activeFileId ? state.fileStatuses[activeFileId] : undefined);
  
  // Hoisted here to satisfy Rules of Hooks: must not call hooks inside nested functions
  const executionStatus = useExecutionStore((state) => state.status);

  const [now, setNow] = React.useState(Date.now());
  
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeLastSaved = useSaveStore((state) => activeFileId ? state.lastSavedAt[activeFileId] : undefined);

  const renderSaveStatus = () => {
    if (!activeFileId) return null;
    
    if (!navigator.onLine && (activeStatus === 'saving' || activeStatus === 'failed' || activeStatus === 'modified')) {
       return (
         <div className="flex items-center text-orange-400 bg-orange-900/30 px-2 h-full">
           <AlertCircle className="w-3 h-3 mr-1.5" />
           <span>Offline (Pending Save)</span>
         </div>
       );
    }
    
    switch (activeStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-blue-400">
            <SudarshanaMandala className="w-3 h-3 mr-1.5" />
            <span>Saving...</span>
          </div>
        );
      case 'conflicted':
        return (
          <div className="flex items-center text-red-400 bg-red-900/30 px-2 h-full">
            <AlertCircle className="w-3 h-3 mr-1.5" />
            <span>Conflict - Save Failed</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center text-red-400 bg-red-900/30 px-2 h-full">
            <AlertCircle className="w-3 h-3 mr-1.5" />
            <span>Retrying... (Save Failed)</span>
          </div>
        );
      case 'modified':
        return (
          <div className="flex items-center text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
            <span>Unsaved</span>
          </div>
        );
      case 'saved':
      default:
        let timeText = "Saved";
        if (activeLastSaved) {
           const diffSec = Math.floor((now - activeLastSaved) / 1000);
           if (diffSec < 2) timeText = "Saved just now";
           else if (diffSec < 60) timeText = `Saved ${diffSec}s ago`;
           else timeText = `Saved ${Math.floor(diffSec/60)}m ago`;
        }
        return (
          <div className="flex items-center text-gray-400">
            <CheckCircle2 className="w-3 h-3 mr-1.5" />
            <span>{timeText}</span>
          </div>
        );
    }
  };

  const renderExecutionStatus = () => {
    // Uses executionStatus from top-level hook call (Rules of Hooks compliance)
    if (executionStatus === 'Ready') return null;

    let icon = null;
    let colorClass = "text-gray-300";

    switch (executionStatus) {
      case 'Compiling':
      case 'Running':
      case 'Cancelling':
        icon = <SudarshanaMandala className="w-3 h-3 mr-1.5" />;
        colorClass = "text-blue-300";
        break;
      case 'Completed':
        icon = <CheckCircle2 className="w-3 h-3 mr-1.5" />;
        colorClass = "text-emerald-400";
        break;
      case 'Timeout':
      case 'Memory Exceeded':
        icon = <AlertCircle className="w-3 h-3 mr-1.5" />;
        colorClass = "text-orange-400 bg-orange-900/30 px-2 h-full";
        break;
      case 'Failed':
        icon = <AlertCircle className="w-3 h-3 mr-1.5" />;
        colorClass = "text-red-400 bg-red-900/30 px-2 h-full";
        break;
      default:
        return null;
    }

    return (
      <div className={cn("flex items-center h-full hover:bg-white/10 cursor-pointer transition-colors px-2 border-l border-white/20 font-medium tracking-wide", colorClass)}>
        {icon}
        <span>{executionStatus}</span>
      </div>
    );
  };

  return (
    <div className="h-6 w-full bg-[#007acc] text-white flex items-center justify-between text-[11px] px-2 select-none flex-shrink-0 z-50 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
      
      {/* Left side items */}
      <div className="flex items-center h-full space-x-1">
        <div className={cn(
          "flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors",
          connectionStatus === 'Disconnected' && "bg-red-500 hover:bg-red-600",
          connectionStatus === 'Reconnecting' && "bg-amber-500 hover:bg-amber-600"
        )}>
          {connectionStatus === 'Connected' ? (
            <CheckCircle2 className="w-3 h-3 mr-1.5" />
          ) : connectionStatus === 'Reconnecting' ? (
            <SudarshanaMandala className="w-3 h-3 mr-1.5" />
          ) : (
            <AlertCircle className="w-3 h-3 mr-1.5" />
          )}
          <span>{connectionStatus}</span>
        </div>

        {activeFileId && (
          <div className="flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors border-l border-white/20">
            {renderSaveStatus()}
          </div>
        )}

        {renderExecutionStatus()}
      </div>

      {/* Right side items */}
      <div className="flex items-center h-full">
        {activeFileId && (
          <>
            <div className="flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors">
              Ln {cursorLine}, Col {cursorColumn}
            </div>
            
            <div className="flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors">
              {spacesOrTabs}: {tabSize}
            </div>
            
            <div className="flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors">
              {encoding}
            </div>
            
            <div className="flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors">
              {lineEnding}
            </div>
            
            <div className="flex items-center h-full px-2 hover:bg-white/10 cursor-pointer transition-colors font-medium">
              {language}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
