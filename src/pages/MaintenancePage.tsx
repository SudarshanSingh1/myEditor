import { useEffect, useRef, useState } from "react";
import { Server, Activity, ShieldAlert, Terminal, RefreshCw } from "lucide-react";
import { useSystemStore } from "../stores/useSystemStore";
import { useUserStore } from "../stores/useUserStore";
import { Navigate } from "react-router-dom";

export function MaintenancePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isMaintenanceMode, maintenanceMessage, checkStatus } = useSystemStore();
  const { user } = useUserStore();
  const [countdown, setCountdown] = useState(12 * 60 + 32); // 12m 32s mock
  const [progress, setProgress] = useState(65);

  useEffect(() => {
    // Check status every 15 seconds
    const interval = setInterval(() => checkStatus(), 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    // Countdown timer
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Progress bar animation mock
    const id = setInterval(() => setProgress(p => Math.min(99, p + (Math.random() * 2))), 5000);
    return () => clearInterval(id);
  }, []);

  // Matrix Rain Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()";
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) drops[x] = 1;

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#8b5cf6"; // Violet matrix
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Super admins bypass this
  if (!isMaintenanceMode) return <Navigate to="/app" replace />;
  if (user?.role === "SUPER_ADMIN") return <Navigate to="/super-admin" replace />;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center overflow-hidden font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-20 pointer-events-none" />
      
      {/* Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
        
        {/* Animated Server Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
          <div className="relative h-24 w-24 bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/10">
            <Server className="w-12 h-12 text-violet-400 animate-pulse" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4 text-center">
          System Maintenance
        </h1>
        
        <p className="text-lg text-gray-400 text-center max-w-md mb-12">
          {maintenanceMessage}
        </p>

        {/* Status Dashboard Card */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-2xl">
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Activity className="w-4 h-4" /> System Status
              </p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-amber-400 font-semibold tracking-wide uppercase text-sm">Upgrading</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Estimated Remaining
              </p>
              <p className="text-white font-mono text-lg tabular-nums">
                {mins}m {secs.toString().padStart(2, '0')}s
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-gray-400 font-mono">
              <span>Applying database migrations...</span>
              <span>{Math.floor(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-1000 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
              </div>
            </div>
          </div>

        </div>

        <button 
          onClick={checkStatus} 
          className="mt-12 flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Auto-refreshing every 15s (Click to check now)
        </button>
      </div>
    </div>
  );
}
