import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { Terminal, Code2, Zap } from "lucide-react";

// Generate heatmap data grouped by columns of 7 (for a classic GitHub-style look)
const cols = 20;
const rows = 7;
// deterministic random-looking data so it doesn't jump on every render
const heatmapData = Array.from({ length: cols }).map((_, cIdx) => 
  Array.from({ length: rows }).map((_, rIdx) => {
    const val = (cIdx * 7 + rIdx * 13) % 100;
    if (val < 40) return 0;
    if (val < 70) return 1;
    if (val < 90) return 2;
    return 3;
  })
);

export function ActivityShowcase() {
  return (
    <section className="py-24 overflow-hidden relative bg-zinc-50 dark:bg-[#050508] border-t border-zinc-200 dark:border-white/5">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent -z-10" />
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6 text-zinc-900 dark:text-white">
              Track your coding journey
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed">
              Stay motivated with detailed activity heatmaps. Visualize your daily progress and keep your coding streak alive. Combine that with a suite of professional features designed to help you write better code, faster.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: Terminal,
                  title: "Built-in Custom Terminal",
                  desc: "Run commands, manage dependencies, and execute scripts instantly right in your browser. Configure your terminal environment exactly how you like it."
                },
                {
                  icon: Code2,
                  title: "Keyboard Shortcuts Galore",
                  desc: "Navigate entirely without your mouse. We support all the standard VS Code shortcuts, plus customizable keybindings for power users."
                },
                {
                  icon: Zap,
                  title: "Lightning Fast Performance",
                  desc: "Experience native-like speed thanks to our optimized WebAssembly runtime and lightweight architecture."
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 + 0.3, duration: 0.5 }}
                  className="group flex gap-5 p-5 rounded-3xl hover:bg-zinc-100 dark:hover:bg-white/[0.03] transition-all duration-300 border border-transparent hover:border-zinc-200 dark:hover:border-white/10 cursor-pointer"
                >
                  <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20 group-hover:scale-110 group-hover:bg-green-500/20 transition-all duration-500 shadow-inner group-hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                    <item.icon className="h-7 w-7 text-green-500 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1.5 text-xl text-zinc-900 dark:text-zinc-100 group-hover:text-green-600 dark:group-hover:text-white transition-colors tracking-tight">{item.title}</h4>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative space-y-6"
          >
            {/* Heatmap Card */}
            <div className="bg-white dark:bg-[#0a0a0f] border border-zinc-200 dark:border-white/5 rounded-[2rem] p-8 shadow-xl dark:shadow-2xl relative z-10 overflow-hidden group hover:border-zinc-300 dark:hover:border-white/10 transition-colors">
              <h3 className="font-bold text-xl mb-8 flex items-center gap-3 text-zinc-900 dark:text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                User Activity
              </h3>
              
              {/* Heatmap Grid */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {heatmapData.map((col, cIdx) => (
                  <div key={cIdx} className="flex flex-col gap-1.5">
                    {col.map((level, rIdx) => (
                      <div
                        key={rIdx}
                        className={`h-[14px] w-[14px] rounded-sm transition-colors duration-300 hover:ring-2 hover:ring-green-500/50 ${
                          level === 0 ? "bg-zinc-100 dark:bg-white/5" :
                          level === 1 ? "bg-green-300 dark:bg-green-500/40" :
                          level === 2 ? "bg-green-500 dark:bg-green-500/70" :
                          "bg-green-600 dark:bg-green-500"
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 font-mono uppercase tracking-widest">
                <span>365 contributions</span>
                <div className="flex items-center gap-2">
                  <span>Less</span>
                  <div className="h-[12px] w-[12px] rounded-sm bg-zinc-100 dark:bg-white/5" />
                  <div className="h-[12px] w-[12px] rounded-sm bg-green-300 dark:bg-green-500/40" />
                  <div className="h-[12px] w-[12px] rounded-sm bg-green-500 dark:bg-green-500/70" />
                  <div className="h-[12px] w-[12px] rounded-sm bg-green-600 dark:bg-green-500" />
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Terminal Mock Card */}
            <div className="bg-[#050508] border border-zinc-800 rounded-[2rem] p-6 shadow-xl dark:shadow-2xl relative z-10 font-mono text-sm overflow-hidden group hover:border-zinc-700 transition-colors mt-8">
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
                  <span className="text-green-400 font-semibold">user@hamara</span>
                  <span className="text-zinc-500">in</span>
                  <span className="text-blue-400 font-semibold">~/project</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">❯</span>
                  <span>npm run dev</span>
                </div>
                <div className="pt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <p className="text-zinc-400">&gt; hamara-app@1.0.0 dev</p>
                  <p className="text-zinc-400">&gt; vite</p>
                  <br/>
                  <p className="text-green-400 font-bold">  VITE v5.1.4  ready in 320 ms</p>
                  <br/>
                  <p>  ➜  <span className="text-white font-bold">Local:</span>   <span className="text-cyan-400 underline cursor-pointer hover:text-cyan-300 transition-colors">http://localhost:5173/</span></p>
                  <p>  ➜  <span className="text-white font-bold">Network:</span> <span className="text-zinc-500">use --host to expose</span></p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-purple-400 animate-pulse">❯</span>
                    <span className="w-2 h-4 bg-white/70 animate-pulse block" />
                  </div>
                </div>
              </div>
              
              {/* Decorative terminal glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Background elements */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-green-500/10 via-primary/5 to-cyan-500/10 rounded-[2.5rem] -z-10 blur-2xl opacity-50" />
          </motion.div>

        </div>
      </Container>
    </section>
  );
}
