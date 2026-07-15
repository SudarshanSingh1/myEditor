import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { TerminalSquare, Flame, Trophy, FileText, CheckCircle2, XCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "../../lib/utils";

// Mock graph data to look very active and realistic
const generateGraphData = () => {
  const data = [];
  const start = new Date("2026-06-15");
  for (let i = 0; i <= 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.toLocaleString('default', { month: 'short' })} ${String(d.getDate()).padStart(2, '0')}`;
    
    if (i === 14) {
      // Exact data requested for the latest day
      data.push({ date: dateStr, total: 60, success: 40, error: 20 });
    } else {
      // Generate realistic looking wave data for previous 14 days
      const base = Math.floor(Math.sin(i / 2) * 10 + 20);
      const success = Math.floor(base * 0.7) + Math.floor(Math.random() * 5);
      const error = Math.floor(base * 0.3) + Math.floor(Math.random() * 3);
      
      data.push({ 
        date: dateStr, 
        total: success + error, 
        success, 
        error 
      });
    }
  }
  return data;
};

export function ActivityShowcase() {
  const graphData = useMemo(() => generateGraphData(), []);
  
  // Heatmap configuration to look very active
  const cols = 20;
  const rows = 7;
  const heatmapData = Array.from({ length: cols }).map((_, cIdx) => 
    Array.from({ length: rows }).map((_, rIdx): number => {
      // Light up exactly the last 15 days
      const dayIndex = cIdx * rows + rIdx;
      const totalDays = cols * rows;
      const daysFromEnd = totalDays - dayIndex;
      
      if (daysFromEnd <= 15) {
        return Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      }
      return 0;
    })
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-4 shadow-2xl">
          <p className="text-gray-400 text-xs mb-3 font-medium tracking-wide uppercase">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-300 text-sm font-medium">{entry.name}</span>
                </div>
                <span className="text-white font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="py-24 overflow-hidden relative bg-zinc-50 dark:bg-[#050508] border-t border-zinc-200 dark:border-white/5 font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent -z-10" />
      
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight sm:text-5xl mb-6 text-zinc-900 dark:text-white"
          >
            Track your coding journey
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed"
          >
            Stay motivated with detailed activity heatmaps and execution analytics. Visualize your daily progress, keep your streak alive, and build amazing things right from your browser.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* LEFT COLUMN: Welcome Stats & Terminal */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 space-y-8 flex flex-col h-full"
          >
            {/* Welcome Stats Mock */}
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors">
              <h3 className="text-3xl font-bold text-white mb-6">Welcome back, Developer!</h3>
              <p className="text-xs font-semibold text-gray-500 tracking-wider mb-4 uppercase">15-Day Activity</p>
              
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Total Submissions: 60
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Correct: 40 (66%)
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Mistakes: 20 (33%)
                </div>
              </div>
            </div>

            {/* Terminal Mock Card */}
            <div className="bg-[#050508] border border-zinc-800 rounded-3xl p-6 shadow-2xl relative flex-1 font-mono text-sm overflow-hidden group hover:border-zinc-700 transition-colors">
              {/* Terminal header */}
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-zinc-500 text-xs mx-auto pr-8">custom-terminal — zsh</span>
              </div>
              
              {/* Terminal content */}
              <div className="text-zinc-300 space-y-2 pl-1 leading-relaxed">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-green-400 font-bold">user@hamara</span>
                  <span className="text-zinc-500">in</span>
                  <span className="text-blue-400 font-bold">~/project</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-bold">❯</span>
                  <span>npm run dev</span>
                </div>
                <div className="pt-2">
                  <p className="text-zinc-400">&gt; hamara-app@1.0.0 dev</p>
                  <p className="text-zinc-400">&gt; vite</p>
                  <br/>
                  <p className="text-green-400 font-bold tracking-wide">  VITE v5.1.4  <span className="text-green-500 font-normal">ready in 320 ms</span></p>
                  <br/>
                  <p>  ➜  <span className="text-white font-bold">Local:</span>   <span className="text-cyan-400 underline cursor-pointer hover:text-cyan-300 transition-colors">http://localhost:5173/</span></p>
                  <p>  ➜  <span className="text-white font-bold">Network:</span> <span className="text-zinc-500">use --host to expose</span></p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-purple-400 font-bold animate-pulse">❯</span>
                    <span className="w-2 h-4 bg-white/70 animate-pulse block" />
                  </div>
                </div>
              </div>
              {/* Decorative terminal glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>
          </motion.div>


          {/* RIGHT COLUMN: Graph & Heatmap */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7 space-y-8 flex flex-col h-full"
          >
            {/* Executions Graph */}
            <div className="rounded-3xl border border-white/5 bg-[#0a0a0f] p-8 shadow-2xl relative group hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <TerminalSquare className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">Code Executions</h2>
                  <p className="text-sm text-gray-400 mt-1">Your success vs error rate over the last 15 days</p>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#888888", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#888888", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#888888', strokeOpacity: 0.2, strokeWidth: 1 }} />
                    
                    <Area type="monotone" dataKey="total" name="Total Executions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 4, fill: '#fff', stroke: '#3b82f6' }} />
                    <Area type="monotone" dataKey="success" name="Successful" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" activeDot={{ r: 4, fill: '#fff', stroke: '#10b981' }} />
                    <Area type="monotone" dataKey="error" name="Errors (Mistakes)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorError)" activeDot={{ r: 4, fill: '#fff', stroke: '#ef4444' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Heatmap Card */}
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 shadow-2xl relative flex-1 group hover:border-white/10 transition-colors">
              
              <div className="flex flex-col sm:flex-row items-start sm:flex-wrap justify-between gap-6 mb-8 relative">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wide">Coding Activity</h3>
                  <p className="text-sm text-zinc-400 mt-1">15 days of intensive coding activity</p>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-3">
                    <Flame className="w-7 h-7 text-orange-500 animate-pulse" fill="currentColor" />
                    <div className="flex flex-col">
                      <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">Current Streak</span>
                      <span className="text-xl font-bold leading-none text-white mt-1">14 days</span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/10 mt-1"></div>
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <div className="flex flex-col">
                      <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">Max Streak</span>
                      <span className="text-xl font-bold leading-none text-white mt-1">62 days</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Heatmap Grid */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {heatmapData.map((col, cIdx) => (
                  <div key={cIdx} className="flex flex-col gap-2">
                    {col.map((level, rIdx) => (
                      <div
                        key={rIdx}
                        className={`h-[14px] w-[14px] rounded-[3px] transition-all duration-300 hover:ring-2 hover:ring-green-500/50 cursor-pointer ${
                          level === 0 ? "bg-white/5" :
                          level === 1 ? "bg-green-500/40" :
                          level === 2 ? "bg-[#16a34a]" :
                          "bg-green-500"
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

          </motion.div>

        </div>
        
        {/* Decorative Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-green-500/10 rounded-full blur-[100px] -z-10 pointer-events-none opacity-50" />
      </Container>
    </section>
  );
}
