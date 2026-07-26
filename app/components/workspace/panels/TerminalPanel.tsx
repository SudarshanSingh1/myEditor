/* eslint-disable react-hooks/exhaustive-deps */
/* oxlint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef } from 'react';

import { Trash2 } from 'lucide-react';

import { useExecutionStore } from '../../../stores/useExecutionStore';

import { useOutputStore } from '../../../stores/useOutputStore';

import { useEditorStore } from '../../../stores/useEditorStore';

import { useUserStore } from '../../../stores/useUserStore';

import { History } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface TerminalPanelProps {
  projectId: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const shellWsRef = useRef<WebSocket | null>(null);
  const execWsRef = useRef<WebSocket | null>(null);
  const execOutputBuffer = useRef<string>('');
  const [preserveOutput, setPreserveOutput] = React.useState(true);
  const [isTerminalReady, setIsTerminalReady] = React.useState(false);

  const pendingExecution = useExecutionStore((state: any) => state.pendingExecution);
  const _setPendingExecution = useExecutionStore((state: any) => state.setPendingExecution);
  const setExecutionFinished = useExecutionStore((state: any) => state.setExecutionFinished);
  const isCancelling = useExecutionStore((state: any) => state.isCancelling);
  const history = useExecutionStore((state: any) => state.history);
  const _runCode = useExecutionStore((state: any) => state.runCode);
  const { settings: editorSettings } = useEditorStore();
  const _user = useUserStore((state: any) => state.user);
  
  const appendLog = useOutputStore((state: any) => state.appendLog);

  const [showHistory, setShowHistory] = React.useState(false);
  
  // Track if we are in 'shell' or 'execution' mode
  const currentMode = useRef<'shell' | 'execution' | 'none'>('none');
  const localPromptShownRef = useRef(false);

  // Initialize Terminal exactly once
  useEffect(() => {
    if (!terminalRef.current) return;
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let onDataDisposable: any = null;
    let termInstance: any = null;
    let fitAddonInstance: any = null;
    
    if (!xtermRef.current) {
      Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/xterm/css/xterm.css')
      ]).then(([xtermPkg, fitPkg]) => {
        if (!isMounted || !terminalRef.current) return;
        
        const TerminalClass = xtermPkg.Terminal || xtermPkg.default?.Terminal || (xtermPkg as any).default;
        const FitAddonClass = fitPkg.FitAddon || fitPkg.default?.FitAddon || (fitPkg as any).default;
        
        if (!TerminalClass || !FitAddonClass) return;
        
        const term = new TerminalClass({
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            selectionBackground: '#264f78',
          },
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, Menlo, Monaco, "Courier New", monospace',
          fontSize: 13,
          cursorBlink: true,
          disableStdin: false,
        });
        
        const fitAddon = new FitAddonClass();
        term.loadAddon(fitAddon);
        
        term.open(terminalRef.current);
        try { fitAddon.fit(); } catch {}
        
        termInstance = term;
        fitAddonInstance = fitAddon;
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        setIsTerminalReady(true);
        
        resizeObserver = new ResizeObserver(() => {
          try {
            fitAddon.fit();
          } catch {}
        });
        resizeObserver.observe(terminalRef.current);
        
        // Custom key handlers for Ctrl+C and Ctrl+L
        term.attachCustomKeyEventHandler((arg: any) => {
          if (arg.type === 'keydown') {
            // Ctrl+C
            if (arg.ctrlKey && arg.key === 'c' && !arg.shiftKey && !arg.altKey && !arg.metaKey) {
              const activeWs = currentMode.current === 'execution' ? execWsRef.current : shellWsRef.current;
              if (activeWs && activeWs.readyState === WebSocket.OPEN) {
                activeWs.send(JSON.stringify({ type: 'signal', signal: 'SIGINT' }));
                return false;
              }
            }
            // Ctrl+L
            if (arg.ctrlKey && arg.key === 'l' && !arg.shiftKey && !arg.altKey && !arg.metaKey) {
              term.clear();
              return false;
            }
          }
          return true;
        });
        
        let localBuffer = '';
        
        onDataDisposable = term.onData((data: string) => {
          const activeWs = currentMode.current === 'execution' ? execWsRef.current : shellWsRef.current;
          if (activeWs && activeWs.readyState === WebSocket.OPEN) {
            activeWs.send(data);
          } else {
            if (data === '\r') {
               const cmd = localBuffer.trim();
               if (cmd === 'clear') {
                  term.write('\x1b[2J\x1b[3J\x1b[H$ ');
               } else if (cmd !== '') {
                  term.writeln(`\r\n\x1b[33mbash: ${cmd}: command not found\x1b[0m`);
                  term.writeln('\x1b[90m(Guest terminals only support code execution output. Please Log In for a full Linux shell!)\x1b[0m');
                  term.write('$ ');
               } else {
                  term.write('\r\n$ ');
               }
               localBuffer = '';
            } else if (data === '\x7f') {
               if (localBuffer.length > 0) {
                   localBuffer = localBuffer.slice(0, -1);
                   term.write('\b \b');
               }
            } else {
               if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7E)) {
                   localBuffer += data;
                   term.write(data);
               }
            }
          }
        });
      });
    }
    
    return () => {
      isMounted = false;
      if (resizeObserver) resizeObserver.disconnect();
      if (onDataDisposable) onDataDisposable.dispose();
      if (termInstance) termInstance.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------
  // Connect to persistent shell (Only happens once per project)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!projectId || !xtermRef.current) return;
    
    // Guests don't have a persistent shell — skip shell WS entirely
    if (projectId.startsWith('guest-')) {
       if (!localPromptShownRef.current && xtermRef.current) {
          xtermRef.current.write('\x1b[90mHamara Editor Terminal (Guest Mode)\x1b[0m\r\n$ ');
          localPromptShownRef.current = true;
       }
       return;
    }
    
    // Only connect if we aren't already connected
    if (shellWsRef.current && (shellWsRef.current.readyState === WebSocket.OPEN || shellWsRef.current.readyState === WebSocket.CONNECTING)) return;
    
    const timeoutId = setTimeout(() => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/execution/ws`;
      
      const ws = new WebSocket(wsUrl);
      shellWsRef.current = ws;

      ws.onopen = () => {
        if (currentMode.current === 'none') {
            currentMode.current = 'shell';
        }
        const payload = {
          mode: 'shell',
          projectId: projectId,
          terminalPrompt: editorSettings.terminalPrompt
        };
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        // Only render shell output if we are in shell mode
        if (currentMode.current !== 'shell') return;
        
        if (typeof event.data === 'string' && xtermRef.current) {
          try {
            const trimmedData = event.data.trim();
            if (trimmedData.startsWith('{') && trimmedData.endsWith('}')) {
              const parsed = JSON.parse(event.data);
              if (parsed.type === 'error') {
                xtermRef.current.writeln(`\r\n\x1b[38;5;1m[Shell Error] ${parsed.message}\x1b[0m\r\n`);
                return;
              }
            }
            xtermRef.current.write(event.data.replace(/\r?\n/g, '\r\n'));
          } catch {
            xtermRef.current.write(event.data.replace(/\r?\n/g, '\r\n'));
          }
        }
      };

      ws.onclose = () => {
        if (currentMode.current === 'shell') {
            currentMode.current = 'none';
        }
        if (shellWsRef.current === ws) shellWsRef.current = null;
      };

      ws.onerror = () => {
        if (currentMode.current === 'shell') {
            currentMode.current = 'none';
        }
        if (shellWsRef.current === ws) shellWsRef.current = null;
      };
      
    }, 200);
    
    return () => {
      clearTimeout(timeoutId);
      // We DO NOT close the shell websocket here, so it persists across re-renders!
      // This solves the persistent shell requirement.
    };
  }, [projectId, isTerminalReady]);

  // ---------------------------------------------------------
  // Handle Execution Trigger (Creates a temporary WS)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!pendingExecution || !xtermRef.current) return;

    const term = xtermRef.current;
    
    // Switch to execution mode
    currentMode.current = 'execution';
    
    // Reset terminal on new run and focus it if preserve is false
    execOutputBuffer.current = '';
    if (!preserveOutput) {
      term.reset();
    } else {
      term.write('\x1b[2K\r'); // Erase current line (old prompt)
    }
    term.focus();
    term.scrollToBottom();
    
    const timeoutId = setTimeout(() => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/execution/ws`;
      
      const ws = new WebSocket(wsUrl);
      execWsRef.current = ws;

      ws.onopen = () => {
        const isVirtual = pendingExecution.projectId.startsWith('guest-');
        
        let payload: any;
        if (isVirtual) {
          const editorState = useEditorStore.getState();
          const content = editorState.localContents[pendingExecution.fileId] || '';
          payload = {
            mode: 'execute_guest',
            content: content,
            language: pendingExecution.language
          };
        } else {
          payload = {
            mode: 'execute',
            projectId: pendingExecution.projectId,
            fileId: pendingExecution.fileId
          };
        }
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (event) => {
        // Only render if we are currently looking at execution
        if (currentMode.current !== 'execution') return;
        
        if (typeof event.data === 'string') {
          execOutputBuffer.current += event.data;
          try {
            const trimmedData = event.data.trim();
            if (trimmedData.startsWith('{') && trimmedData.endsWith('}')) {
              const parsed = JSON.parse(event.data);
              if (parsed.type === 'error') {
                if (parsed.message.includes('quota exceeded')) {
                  const editorState = useEditorStore.getState();
                  const guestFileId = editorState.activeFileId;
                  if (guestFileId && guestFileId.startsWith('guest-')) {
                      const content = editorState.localContents[guestFileId];
                      if (content) {
                          localStorage.setItem('pendingGuestCode', JSON.stringify({
                              language: editorState.projectLanguage || 'python',
                              content: content
                          }));
                      }
                  }
                  window.location.href = '/login';
                  return;
                }
                term.writeln(`\r\n\x1b[38;5;1m[Server Error] ${parsed.message}\x1b[0m\r\n`);
                appendLog(`[WebSocket Error] ${parsed.message}`, 'System');
                return;
              }
            }
            term.write(event.data.replace(/\r?\n/g, '\r\n'));
          } catch {
            term.write(event.data.replace(/\r?\n/g, '\r\n'));
          }
        }
      };

      ws.onclose = (event) => {
        setExecutionFinished(0); // Mark done
        if (execWsRef.current === ws) execWsRef.current = null;
        
        // If it was a clean close, we assume execution ran. We can safely increment quota.
        if (event.code === 1000 || event.code === 1006) {
           useUserStore.getState().incrementGuestQuota();
        }
        
        // Parse compiler output for markers
        if (pendingExecution.language === 'cpp' || pendingExecution.language === 'c') {
          // oxlint-disable-next-line no-control-regex
          // eslint-disable-next-line no-control-regex
          const rawOutput = execOutputBuffer.current.replace(/\x1b\[[0-9;]*m/g, ''); // strip ansi
          const regex = /^([a-zA-Z0-9_\-.]+):(\d+):(?:(\d+):)?\s+(error|warning|fatal error):\s+(.*)$/gm;
          let match;
          const markers = [];
          while ((match = regex.exec(rawOutput)) !== null) {
            const [, _file, line, col, severityStr, msg] = match;
            // Severity mapping
            let severity = 8; // Error
            if (severityStr === 'warning') severity = 4; // Warning
            
            // Only add if it's the executed file (or ideally check file structure)
            markers.push({
              severity,
              message: msg,
              startLineNumber: parseInt(line),
              startColumn: col ? parseInt(col) : 1,
              endLineNumber: parseInt(line),
              endColumn: col ? parseInt(col) + 100 : 100, // Arbitrary length if not provided
            });
          }
          
          if (markers.length > 0) {
            useEditorStore.getState().setMarkers(pendingExecution.fileId, markers);
          } else {
            useEditorStore.getState().clearMarkers(pendingExecution.fileId);
          }
        }
        
        // Restore shell mode after execution finishes
        currentMode.current = 'shell';
        
        // Synthesize an Enter press to refresh bash prompt
        if (shellWsRef.current && shellWsRef.current.readyState === WebSocket.OPEN) {
            shellWsRef.current.send('\r');
        } else {
            if (xtermRef.current) {
                xtermRef.current.write('\r\n$ ');
            }
        }
      };

      ws.onerror = () => {
        setExecutionFinished(1);
        if (execWsRef.current === ws) execWsRef.current = null;
        currentMode.current = 'shell';
      };
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (execWsRef.current && (execWsRef.current.readyState === WebSocket.OPEN || execWsRef.current.readyState === WebSocket.CONNECTING)) {
        execWsRef.current.close();
      }
    };
  }, [pendingExecution, setExecutionFinished, appendLog, preserveOutput, isTerminalReady]);

  // Handle manual cancel from Stop button
  useEffect(() => {
    if (isCancelling && execWsRef.current) {
      xtermRef.current?.writeln('\r\n\x1b[38;5;3m[System] Execution Cancelled by User\x1b[0m\r\n');
      execWsRef.current.close();
      setExecutionFinished(1);
    }
  }, [isCancelling, setExecutionFinished, isTerminalReady]);

  // Force fit when panel opens/shows
  useEffect(() => {
    const timer = setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (shellWsRef.current && (shellWsRef.current.readyState === WebSocket.OPEN || shellWsRef.current.readyState === WebSocket.CONNECTING)) {
        shellWsRef.current.close();
      }
      if (execWsRef.current && (execWsRef.current.readyState === WebSocket.OPEN || execWsRef.current.readyState === WebSocket.CONNECTING)) {
        execWsRef.current.close();
      }
    };
  }, []);

  const handleClear = () => {
    if (!xtermRef.current) return;
    xtermRef.current.write('\x1b[2J\x1b[3J\x1b[H');
    if (currentMode.current === 'none' || (currentMode.current === 'shell' && projectId?.startsWith('guest-'))) {
      xtermRef.current.write('$ ');
    }
  };

  return (
    <div className="w-full h-full bg-[#1e1e1e] p-2 overflow-hidden flex flex-col relative group">
      <div className="absolute top-2 right-4 flex items-center space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setShowHistory(true)}
          className="text-gray-400 hover:text-white text-xs flex items-center space-x-1 p-1 rounded-md hover:bg-[#2d2d2d]"
          title="Execution History"
        >
          <History size={14} />
          <span>History</span>
        </button>
        <button
          onClick={() => setPreserveOutput(!preserveOutput)}
          className={preserveOutput ? "text-primary text-xs flex items-center space-x-1 p-1 bg-[#2d2d2d] rounded-md" : "text-gray-400 hover:text-white text-xs flex items-center space-x-1 p-1 rounded-md hover:bg-[#2d2d2d]"}
          title="Preserve output across runs"
        >
          <span>Preserve</span>
        </button>
        <button 
          onClick={handleClear}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#2d2d2d]"
          title="Clear Terminal"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex-1 w-full h-full" ref={terminalRef} />

      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Execution History"
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No execution history yet.</p>
          ) : (
            history.map((item: any) => (
              <div key={item.id} className="p-3 bg-muted rounded-md flex justify-between items-center border border-border">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">{item.language}</span>
                    <span className={`text-xs px-1.5 rounded ${item.exit_code === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {item.exit_code === 0 ? 'Success' : `Exit: ${item.exit_code}`}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                {/* Note: We can only run the active file via runCode currently, or we can dispatch an open file event then run. For now, it's just a log. */}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
