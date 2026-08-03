import { useEffect, useRef, useState } from "react";
import { TerminalSquare, RefreshCw, XCircle, Play, Pause } from "lucide-react";
import { useUserStore } from "../../stores/useUserStore";
import { PageHeader } from "../../components/enterprise/PageHeader";
import "../../styles/enterprise.css";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const connect = () => {
    if (ws.current) return;
    
    // Connect to WebSocket — auth is handled via httpOnly cookie automatically for same-origin.
    // For cross-origin (e.g., VITE_API_URL differs from window.location.host) we pass nothing
    // since cookies are httpOnly and can't be read by JS. The backend accepts cookie OR query param.
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.VITE_API_URL 
      ? new URL(import.meta.env.VITE_API_URL).host 
      : window.location.host;
      
    ws.current = new WebSocket(`${protocol}//${host}/api/v1/admin/logs/ws`);
    
    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => {
      setIsConnected(false);
      ws.current = null;
    };
    ws.current.onerror = () => setIsConnected(false);
    
    ws.current.onmessage = (e) => {
      if (!isPaused) {
        setLogs(prev => [...prev.slice(-999), e.data]);
      }
    };
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  // Connect once on mount, clean up on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button 
          className={isConnected ? "e-btn e-btn-danger" : "e-btn e-btn-primary"} 
          onClick={isConnected ? disconnect : connect}
        >
          {isConnected ? <XCircle size={14} /> : <RefreshCw size={14} />}
          {isConnected ? "Disconnect" : "Connect"}
        </button>
        
        <button 
          className="e-btn e-btn-secondary" 

          onClick={() => setIsPaused(!isPaused)}
          disabled={!isConnected}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? "Resume" : "Pause"}
        </button>

        <button 
          className="e-btn e-btn-secondary" 
          onClick={() => setLogs([])}
        >
          Clear Terminal
        </button>
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
