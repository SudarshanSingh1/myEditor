import React, { useEffect, useRef, useState, useMemo } from "react";
import { Server, ShieldAlert, Activity, Terminal } from "lucide-react";
import { useSystemStore } from "../stores/useSystemStore";
import { useUserStore } from "../stores/useUserStore";
import { Navigate, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

// --- Matrix Rain Component ---
const MATRIX_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";

const BinaryRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const fontSize = 24;
    const charSpacing = fontSize;
    const columns = Math.floor(width / fontSize);
    
    // Classic Matrix greens
    const colors = ["#00FF41", "#00FF41", "#03A062", "#008F11"];
    
    const getRandomChar = () => MATRIX_CHARSET.charAt(Math.floor(Math.random() * MATRIX_CHARSET.length));

    const drops: { y: number; speed: number; chars: string[]; color: string; opacity: number; length: number }[] = [];

    for (let x = 0; x < columns; x++) {
      const speed = 1 + Math.random() * 2; 
      const length = 10 + Math.random() * 30;
      drops[x] = {
        y: -(Math.random() * 100), 
        speed: speed,
        chars: Array.from({ length: Math.floor(length) }, getRandomChar),
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.7 + Math.random() * 0.3, 
        length: length,
      };
    }

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (dt > 0.1) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = "rgba(5, 5, 8, 0.25)"; 
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        
        // Mutate characters rapidly to create the classic cipher effect
        if (Math.random() > 0.2) {
          const charIdx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[charIdx] = getRandomChar();
        }

        const xPos = i * fontSize + (fontSize / 2);

        for (let j = 0; j < drop.length; j++) {
          const yPos = drop.y - j;
          if (yPos < 0 || yPos > height / charSpacing + drop.length) continue;
          
          const isHead = j === 0;
          ctx.fillStyle = isHead ? "#FFF" : drop.color;
          
          const alpha = isHead ? 1.0 : drop.opacity * Math.max(0, 1 - (j / drop.length));
          ctx.globalAlpha = alpha;
          
          const char = drop.chars[j % drop.chars.length];
          
          if (isHead) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00FF41";
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillText(char, xPos, yPos * charSpacing);
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        drop.y += drop.speed * dt * 12;

        if (drop.y - drop.length > height / charSpacing) {
          drop.speed = 1 + Math.random() * 2;
          drop.y = -drop.length;
          drop.color = colors[Math.floor(Math.random() * colors.length)];
          drop.opacity = 0.7 + Math.random() * 0.3;
          drop.length = 10 + Math.random() * 30;
          drop.chars = Array.from({ length: Math.floor(drop.length) }, getRandomChar);
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw(performance.now());

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <div className="absolute inset-0 bg-[#0a0a0f]" />;
  }
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-80" />;
};

// --- Floating System Text ---
const FLOATING_LABELS = [
  "INITIALIZING", "PATCHING", "VERIFYING", "UPDATING", 
  "OPTIMIZING", "SYNCING", "BUILDING", "AUTH", 
  "API", "DATABASE", "EDITOR", "CACHE", 
  "DOCKER", "NGINX", "CONTAINER", "WEBSOCKET", 
  "COMPILER", "EXECUTION ENGINE"
];

const FloatingText = () => {
  const [labels, setLabels] = useState<{ id: number; text: string; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    const newLabels = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      text: FLOATING_LABELS[Math.floor(Math.random() * FLOATING_LABELS.length)],
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      delay: Math.random() * 5,
    }));
    setLabels(newLabels);
    
    const interval = setInterval(() => {
      setLabels(prev => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        next[idx] = {
          id: Date.now() + Math.random(),
          text: FLOATING_LABELS[Math.floor(Math.random() * FLOATING_LABELS.length)],
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          delay: 0,
        };
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {labels.map(l => (
        <motion.div
          key={l.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.15, 0], scale: [0.8, 1, 1.1] }}
          transition={{ duration: 6, delay: l.delay, ease: "easeInOut" }}
          style={{ left: `${l.x}%`, top: `${l.y}%` }}
          className="absolute text-cyan-500/30 font-mono text-xl tracking-widest uppercase font-bold blur-[1px]"
        >
          {l.text}
        </motion.div>
      ))}
    </div>
  );
};

// --- STAGES ---
const STAGES = [
  "Deploying update...",
  "Migrating database...",
  "Restarting execution engine...",
  "Optimizing containers...",
  "Clearing cache...",
  "Verifying services..."
];

export function MaintenancePage() {
  const { isMaintenanceMode, maintenanceMessage, maintenanceEndTime, checkStatus, isChecking, hasChecked } = useSystemStore();
  const { user } = useUserStore();
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();

  // Countdown state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(3600); // Default 1hr baseline for progress
  const [stageIndex, setStageIndex] = useState(0);

  // Status dot color
  const statusColors = ["bg-red-500", "bg-yellow-500", "bg-green-500"];
  const [statusColorIdx, setStatusColorIdx] = useState(0);

  useEffect(() => {
    // Check status on mount, then poll every 30s
    checkStatus();
    const id = setInterval(() => checkStatus(), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Status dot blinker
    const id = setInterval(() => {
      setStatusColorIdx(prev => (prev + 1) % statusColors.length);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Stage text rotator
    const id = setInterval(() => {
      setStageIndex(prev => (prev + 1) % STAGES.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!maintenanceEndTime) {
      setTimeLeft(null);
      return;
    }
    
    const end = new Date(maintenanceEndTime).getTime();
    const now = new Date().getTime();
    
    // If the end time is already in the past when we first load,
    // just show 0 — do NOT reload. Reloading here causes an infinite
    // full-page-reload loop because each reload re-triggers this code.
    const initialDiff = Math.max(0, Math.floor((end - now) / 1000));
    if (initialDiff === 0) {
      setTimeLeft(0);
      return; // Don't start interval, don't reload
    }
    
    // Timer is still running — start countdown
    setTimeLeft(initialDiff);
    
    const id = setInterval(() => {
      const currentDiff = Math.max(0, Math.floor((end - new Date().getTime()) / 1000));
      setTimeLeft(currentDiff);
      
      // Only reload when timer actively reaches 0 (was > 0 before)
      if (currentDiff === 0) {
        clearInterval(id);
        // Re-check status instead of blind reload
        checkStatus();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [maintenanceEndTime, checkStatus]);

  // CRITICAL: Never redirect until we've positively confirmed status from the backend.
  // Without this, the default `isMaintenanceMode: false` causes an immediate redirect
  // to /app, which triggers MaintenanceGuard → redirect back here → infinite loop.
  if (!hasChecked || isChecking) {
    return (
      <div className="relative min-h-screen bg-[#050508] flex flex-col items-center justify-center overflow-hidden font-sans">
        <BinaryRain />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1))] bg-[length:100%_4px] mix-blend-overlay opacity-30" />
        <div className="flex flex-col items-center z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500/50 border-t-cyan-500" />
        </div>
      </div>
    );
  }

  // Only redirect AFTER we've confirmed maintenance is genuinely off
  if (!isMaintenanceMode) return <Navigate to={location.state?.from || "/app"} replace />;
  if (user?.role === "OWNER" || user?.role === "ADMIN") return <Navigate to={location.state?.from || "/app"} replace />;

  const progressPercent = timeLeft !== null ? Math.max(0, Math.min(100, 100 - (timeLeft / totalDuration) * 100)) : 100;

  const formatTime = (secs: number) => {
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen bg-[#050508] flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* Background Effects */}
      <BinaryRain />
      {!prefersReducedMotion && <FloatingText />}
      
      {/* Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1))] bg-[length:100%_4px] mix-blend-overlay opacity-30" />
      
      {/* Digital Noise */}
      <svg className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay w-full h-full">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      
      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
        
        {/* Simple Minimalist Icon */}
        <div className="relative mb-8 group">
          <div className="relative h-24 w-24 bg-[#0a0a0f] border border-green-500/30 rounded-2xl flex items-center justify-center overflow-hidden">
            <Server className="w-12 h-12 text-green-500 relative z-10" strokeWidth={1.5} />
            <div className="absolute bottom-3 right-3 h-2.5 w-2.5 rounded-full flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${statusColors[statusColorIdx]}`} />
              <div className={`relative h-1.5 w-1.5 rounded-full ${statusColors[statusColorIdx]}`} />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white tracking-widest mb-3 text-center uppercase">
          SYSTEM MAINTENANCE
        </h1>
        
        <p className="text-base md:text-lg text-green-400 text-center max-w-lg mb-12 font-mono">
          {maintenanceMessage}
        </p>

        {/* Minimal Terminal Card */}
        <div className="w-full relative bg-[#050508]/90 border border-green-500/20 rounded-xl p-6 md:p-8 backdrop-blur-sm">
          
          <div className={`grid grid-cols-1 ${timeLeft !== null && timeLeft > 0 ? "md:grid-cols-2" : ""} gap-6 mb-8`}>
            
            <div className={`space-y-2 ${timeLeft === null || timeLeft === 0 ? "flex flex-col items-center text-center" : ""}`}>
              <p className={`text-[10px] font-bold text-green-600/80 flex items-center gap-2 uppercase tracking-[0.2em] ${timeLeft === null || timeLeft === 0 ? "justify-center" : ""}`}>
                <Activity className="w-3.5 h-3.5 text-green-500" /> Current Stage
              </p>
              <div className="flex items-center min-h-[2rem]">
                <motion.span 
                  key={stageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-green-400 font-mono text-sm tracking-widest uppercase"
                >
                  &gt; {STAGES[stageIndex]}
                </motion.span>
              </div>
            </div>

            {timeLeft !== null && (
              <div className={`space-y-2 ${timeLeft === 0 ? "flex flex-col items-center text-center mt-4 md:mt-0" : "md:text-right"}`}>
                <p className={`text-[10px] font-bold text-green-600/80 flex items-center gap-2 uppercase tracking-[0.2em] ${timeLeft === 0 ? "justify-center" : "md:justify-end"}`}>
                  <Terminal className="w-3.5 h-3.5 text-green-500" /> Time Remaining
                </p>
                <div className={`flex items-center ${timeLeft === 0 ? "justify-center" : "md:justify-end"}`}>
                  {timeLeft > 0 ? (
                    <p className="text-white font-mono text-xl sm:text-2xl md:text-3xl tracking-wider tabular-nums font-bold whitespace-nowrap">
                      {formatTime(timeLeft)}
                    </p>
                  ) : (
                    <span className="text-sm font-bold text-green-400 uppercase tracking-widest">
                      Completing soon...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {timeLeft !== null && timeLeft > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] text-green-600/80 font-mono uppercase tracking-[0.2em]">
                <span>System Recovery</span>
                <span>{Math.floor(progressPercent)}%</span>
              </div>
              <div className="h-1 w-full bg-[#111] overflow-hidden border border-green-500/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className="h-full bg-green-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <ShieldAlert className="w-3 h-3 text-red-500/70" /> Need urgent access? Contact admin.
          </p>
        </div>
      </div>
    </div>
  );
}
