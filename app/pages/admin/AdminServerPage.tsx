import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Server, Cpu, MemoryStick, HardDrive, Network, Container, RefreshCw, Activity } from "lucide-react";

interface ServerData {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  api_status: string;
  docker_status: string;
  docker_containers: number;
}

function GaugeBar({ value, label, icon: Icon, colorClass }: { value: number; label: string; icon: any; colorClass: string }) {
  const clampedVal = Math.min(100, Math.max(0, value));
  
  // Dynamic color based on usage
  let activeColor = colorClass;
  if (clampedVal > 85) activeColor = "from-red-500 to-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.5)]";
  else if (clampedVal > 65) activeColor = "from-amber-500 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]";
  else activeColor = `${colorClass} shadow-[0_0_15px_rgba(139,92,246,0.2)]`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl group">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2.5 rounded-xl bg-white/5 text-gray-400 group-hover:text-white transition-colors">
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-gray-300 tracking-wide">{label}</p>
      </div>
      
      <div className="flex items-end justify-between mb-3 relative z-10">
        <span className="text-3xl font-bold text-white tabular-nums tracking-tight">{clampedVal.toFixed(1)}<span className="text-xl text-gray-500">%</span></span>
      </div>
      
      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden relative z-10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${activeColor} transition-all duration-1000 ease-out`}
          style={{ width: `${clampedVal}%` }}
        >
          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, label, icon: Icon }: { status: string; label: string; icon: any }) {
  const isOnline = status.toLowerCase() === "online" || status.toLowerCase() === "running" || status.toLowerCase() === "healthy";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 flex items-center justify-between backdrop-blur-sm shadow-xl group hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-gray-300 tracking-wide">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`relative flex h-2.5 w-2.5`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-400"} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-emerald-500" : "bg-red-500"}`}></span>
        </span>
        <span className={`text-sm font-bold uppercase tracking-wider ${isOnline ? "text-emerald-400" : "text-red-400"}`}>{status}</span>
      </div>
    </div>
  );
}

export default function AdminServerPage() {
  const [data, setData] = useState<ServerData | null>(null);
  const [history, setHistory] = useState<{ t: string; cpu: number; ram: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const poll = async () => {
    try {
      const resp = await fetchApi("/admin/server");
      if (resp?.success) {
        const d = resp.data as ServerData;
        setData(d);
        setLastUpdate(new Date());
        setHistory(prev => {
          const next = [...prev, { t: new Date().toLocaleTimeString(), cpu: d.cpu_percent, ram: d.ram_percent }];
          return next.slice(-20); // keep last 20 points
        });
      }
    } catch (e: any) {
      // Silent fail on poll
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Server Infrastructure</h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Auto-refreshes every 5s {lastUpdate && `(Last: ${lastUpdate.toLocaleTimeString()})`}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/5 p-6 animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded mb-6" />
              <div className="h-8 w-16 bg-white/10 rounded mb-3" />
              <div className="h-2 w-full bg-white/8 rounded-full" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-gray-400">
          Failed to retrieve server metrics.{" "}
          <button onClick={poll} className="text-blue-400 hover:underline">Retry Connection</button>
        </div>
      ) : (
        <>
          {/* Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <GaugeBar value={data.cpu_percent} label="CPU Utilization" icon={Cpu} colorClass="from-violet-500 to-fuchsia-600" />
            <GaugeBar value={data.ram_percent} label={`Memory (${data.ram_used_gb}/${data.ram_total_gb} GB)`} icon={MemoryStick} colorClass="from-blue-500 to-cyan-500" />
            <GaugeBar value={data.disk_percent} label={`Storage (${data.disk_used_gb}/${data.disk_total_gb} GB)`} icon={HardDrive} colorClass="from-emerald-500 to-teal-500" />
          </div>

          {/* Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatusBadge status={data.api_status} label="Main API Gateway" icon={Network} />
            <StatusBadge status={data.docker_status} label="Docker Engine" icon={Container} />
            <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 flex items-center justify-between backdrop-blur-sm shadow-xl group hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
                  <Container className="w-5 h-5" strokeWidth={2} />
                </div>
                <p className="text-sm font-semibold text-gray-300 tracking-wide">Active Containers</p>
              </div>
              <span className="text-2xl font-bold text-white tabular-nums tracking-tight">{data.docker_containers}</span>
            </div>
          </div>

          {/* Live Chart */}
          <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white tracking-wide">Live Telemetry Stream</h3>
            </div>
            
            {history.length < 2 ? (
              <div className="h-64 flex items-center justify-center text-gray-500 text-sm font-medium">Establishing telemetry connection...</div>
            ) : (
              <div className="h-64 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCpuLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRamLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis dataKey="t" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#0a0a0f", border: "1px solid #ffffff15", borderRadius: 12, color: "#fff", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
                      itemStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fill="url(#gradCpuLive)" strokeWidth={3} dot={false} name="CPU %" activeDot={{ r: 6, fill: "#fff", stroke: "#8b5cf6", strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="ram" stroke="#0ea5e9" fill="url(#gradRamLive)" strokeWidth={3} dot={false} name="RAM %" activeDot={{ r: 6, fill: "#fff", stroke: "#0ea5e9", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
