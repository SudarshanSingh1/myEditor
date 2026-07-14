import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { Trash2 } from 'lucide-react';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useExecutionStore } from '../../../store/useExecutionStore';
import { useOutputStore } from '../../../store/useOutputStore';
import { useEditorStore } from '../../../store/useEditorStore';
import { useUserStore } from '../../../stores/useUserStore';
import { History, Play } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

interface TerminalPanelProps {
  projectId: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ projectId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellWsRef = useRef<WebSocket | null>(null);
  const execWsRef = useRef<WebSocket | null>(null);
  const execOutputBuffer = useRef<string>('');
  const [preserveOutput, setPreserveOutput] = React.useState(true);

  const pendingExecution = useExecutionStore((state: any) => state.pendingExecution);
  const setPendingExecution = useExecutionStore((state: any) => state.setPendingExecution);
  const setExecutionFinished = useExecutionStore((state: any) => state.setExecutionFinished);
  const isCancelling = useExecutionStore((state: any) => state.isCancelling);
  const history = useExecutionStore((state: any) => state.history);
  const runCode = useExecutionStore((state: any) => state.runCode);
  const { settings: editorSettings } = useEditorStore();
  const user = useUserStore((state: any) => state.user);
  
  const appendLog = useOutputStore((state: any) => state.appendLog);

  const [showHistory, setShowHistory] = React.useState(false);
  
  // Track if we are in 'shell' or 'execution' mode
  const currentMode = useRef<'shell' | 'execution' | 'none'>('none');

  // Initialize Terminal exactly once
  useEffect(() => {
    if (!terminalRef.current) return;
    
    if (!xtermRef.current) {
      const term = new Terminal({
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
      
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      term.open(terminalRef.current);
      fitAddon.fit();
      
      // No noisy ready message
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      
      // Use ResizeObserver for robust fitting
      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch (e) {}
      });
      resizeObserver.observe(terminalRef.current);
      
      // Custom key handlers for Ctrl+C and Ctrl+L
      term.attachCustomKeyEventHandler((arg) => {
        if (arg.type === 'keydown') {
          // Ctrl+C
          if (arg.ctrlKey && arg.key === 'c' && !arg.shiftKey && !arg.altKey && !arg.metaKey) {
            // Send SIGINT to the currently active websocket
            const activeWs = currentMode.current === 'execution' ? execWsRef.current : shellWsRef.current;
            if (activeWs && activeWs.readyState === WebSocket.OPEN) {
              activeWs.send(JSON.stringify({ type: 'signal', signal: 'SIGINT' }));
              return false; // Prevent default
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

      // Route input to the active websocket
      const onDataDisposable = term.onData((data) => {
        const activeWs = currentMode.current === 'execution' ? execWsRef.current : shellWsRef.current;
        if (activeWs && activeWs.readyState === WebSocket.OPEN) {
          activeWs.send(data);
        }
      });

      return () => {
        resizeObserver.disconnect();
        onDataDisposable.dispose();
        term.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
      };
    }
  }, []);

  // ---------------------------------------------------------
  // Connect to persistent shell (Only happens once per project)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!projectId || !xtermRef.current) return;
    
    // Only connect if we aren't already connected
    if (shellWsRef.current && (shellWsRef.current.readyState === WebSocket.OPEN || shellWsRef.current.readyState === WebSocket.CONNECTING)) return;
    
    const timeoutId = setTimeout(() => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/execution/ws`;
      
      console.log("[TerminalPanel] Creating shell websocket at:", wsUrl);
      const ws = new WebSocket(wsUrl);
      shellWsRef.current = ws;

      ws.onopen = () => {
        console.log("[TerminalPanel] Shell WebSocket opened, readyState:", ws.readyState);
        if (currentMode.current === 'none') {
            currentMode.current = 'shell';
        }
        const payload = {
          mode: 'shell',
          projectId: projectId,
          terminalPrompt: editorSettings.terminalPrompt
        };
        console.log("[TerminalPanel] Sending shell init packet");
        console.log(payload);
        ws.send(JSON.stringify(payload));
        console.log("[TerminalPanel] Shell packet sent");
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
          } catch (e) {
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
  }, [projectId]);

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
      
      console.log("[TerminalPanel] Creating websocket at:", wsUrl);
      const ws = new WebSocket(wsUrl);
      execWsRef.current = ws;

      ws.onopen = () => {
        console.log("[TerminalPanel] WebSocket opened, readyState:", ws.readyState);
        const payload = {
          mode: 'execute',
          projectId: pendingExecution.projectId,
          fileId: pendingExecution.fileId
        };
        console.log("[TerminalPanel] Sending initialization packet");
        console.log(payload);
        ws.send(JSON.stringify(payload));
        console.log("[TerminalPanel] Packet sent");
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
                term.writeln(`\r\n\x1b[38;5;1m[Server Error] ${parsed.message}\x1b[0m\r\n`);
                appendLog(`[WebSocket Error] ${parsed.message}`, 'System');
                return;
              }
            }
            term.write(event.data.replace(/\r?\n/g, '\r\n'));
          } catch (e) {
            term.write(event.data.replace(/\r?\n/g, '\r\n'));
          }
        }
      };

      ws.onclose = (event) => {
        setExecutionFinished(0); // Mark done
        if (execWsRef.current === ws) execWsRef.current = null;
        
        // Parse compiler output for markers
        if (pendingExecution.language === 'cpp' || pendingExecution.language === 'c') {
          const rawOutput = execOutputBuffer.current.replace(/\x1b\[[0-9;]*m/g, ''); // strip ansi
          const regex = /^([a-zA-Z0-9_\-\.]+):(\d+):(?:(\d+):)?\s+(error|warning|fatal error):\s+(.*)$/gm;
          let match;
          const markers = [];
          while ((match = regex.exec(rawOutput)) !== null) {
            const [, file, line, col, severityStr, msg] = match;
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
  }, [pendingExecution, setExecutionFinished, appendLog, preserveOutput]);

  // Handle manual cancel from Stop button
  useEffect(() => {
    if (isCancelling && execWsRef.current) {
      xtermRef.current?.writeln('\r\n\x1b[38;5;3m[System] Execution Cancelled by User\x1b[0m\r\n');
      execWsRef.current.close();
      setExecutionFinished(1);
    }
  }, [isCancelling, setExecutionFinished]);

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
    xtermRef.current?.clear();
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
