import { useEffect, useRef, useState, useCallback } from "react";
import { TerminalSquare, RefreshCw, XCircle, Play, Pause, AlertCircle } from "lucide-react";
import { PageHeader } from "../../components/enterprise/PageHeader";
import "../../styles/enterprise.css";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  
  const isPausedRef = useRef(isPaused);
  const pauseBufferRef = useRef<string[]>([]);
  
  // Keep ref in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
    // Flush buffer on unpause
    if (!isPaused && pauseBufferRef.current.length > 0) {
      setLogs(prev => [...prev, ...pauseBufferRef.current].slice(-1000));
      pauseBufferRef.current = [];
    }
  }, [isPaused]);

  const connect = useCallback(() => {
    if (ws.current) return;
    
    setIsReconnecting(reconnectAttempts.current > 0);
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.VITE_API_URL 
      ? new URL(import.meta.env.VITE_API_URL).host 
      : window.location.host;
      
    const socket = new WebSocket(`${protocol}//${host}/api/v1/admin/logs/ws`);
    ws.current = socket;
    
    socket.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttempts.current = 0;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    
    socket.onclose = () => {
      setIsConnected(false);
      ws.current = null;
      
      // Auto-reconnect with exponential backoff
      const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      reconnectAttempts.current += 1;
      setIsReconnecting(true);
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, backoff);
    };
    
    socket.onerror = () => {
      // close event will trigger reconnect
      socket.close();
    };
    
    socket.onmessage = (e) => {
      // Add timestamp if missing
      let logLine = e.data;
      if (!/^\[\d{4}-\d{2}-\d{2}/.test(logLine) && !/^\d{4}-\d{2}-\d{2}/.test(logLine)) {
        const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
        logLine = `[${ts}] ${logLine}`;
      }
      
      if (isPausedRef.current) {
        pauseBufferRef.current.push(logLine);
        if (pauseBufferRef.current.length > 1000) {
          pauseBufferRef.current = pauseBufferRef.current.slice(-1000);
        }
      } else {
        setLogs(prev => [...prev, logLine].slice(-1000));
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttempts.current = 0;
    setIsReconnecting(false);
    
    if (ws.current) {
      // Override onclose so it doesn't trigger reconnect when manually disconnected
      ws.current.onclose = () => {
        setIsConnected(false);
        ws.current = null;
      };
      ws.current.close();
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (terminalRef.current && !isPaused) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  return (
    <div className="e-page fade-in">
      <PageHeader 
        title="Live Server Logs" 
        subtitle="Real-time application activity stream" 
        icon={TerminalSquare} 
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <button 
          className={isConnected ? "e-btn e-btn-danger" : "e-btn e-btn-primary"} 
          onClick={isConnected ? disconnect : connect}
          disabled={isReconnecting}
        >
          {isConnected ? <XCircle size={14} /> : <RefreshCw size={14} className={isReconnecting ? "spin" : ""} />}
          {isConnected ? "Disconnect" : isReconnecting ? `Reconnecting (${reconnectAttempts.current})...` : "Connect"}
        </button>
        
        <button 
          className="e-btn e-btn-secondary" 
          onClick={() => setIsPaused(!isPaused)}
          disabled={!isConnected}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? `Resume (${pauseBufferRef.current.length} buffered)` : "Pause"}
        </button>

        <button 
          className="e-btn e-btn-secondary" 
          onClick={() => {
            setLogs([]);
            pauseBufferRef.current = [];
          }}
        >
          Clear Terminal
        </button>
        
        {isReconnecting && (
          <span style={{ fontSize: 13, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6, marginLeft: 10 }}>
            <AlertCircle size={14} /> Connection lost. Retrying...
          </span>
        )}
      </div>

      <div 
        style={{
          background: "#09090b",
          border: "1px solid var(--e-border)",
          borderRadius: 8,
          padding: 16,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12,
          color: "#a1a1aa",
          height: "calc(100vh - 280px)",
          overflowY: "auto",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
        }}
        ref={terminalRef}
      >
        {logs.length === 0 ? (
          <div style={{ color: "#52525b", fontStyle: "italic", textAlign: "center", marginTop: 40 }}>
            Waiting for logs...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ 
              marginBottom: 4, 
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              paddingBottom: 4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all"
            }}>
              {log.includes("ERROR") || log.includes("CRITICAL") ? (
                <span style={{ color: "#ef4444" }}>{log}</span>
              ) : log.includes("WARNING") ? (
                <span style={{ color: "#f59e0b" }}>{log}</span>
              ) : log.includes("INFO") ? (
                <span style={{ color: "#3b82f6" }}>{log}</span>
              ) : (
                <span>{log}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
