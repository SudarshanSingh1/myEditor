import { motion } from "framer-motion";
import { Play, History, FolderTree, Search, Settings, Server } from "lucide-react";
import { Container } from "../layout/Container";
import { SectionTitle } from "../ui/SectionTitle";
import { WindowControls } from "../ui/WindowControls";

const getLangColor = (lang: string) => {
  const colors: Record<string, string> = {
    Python: "#3572A5",
    "C++": "#f34b7d",
    Java: "#b07219",
    JavaScript: "#f1e05a",
    Go: "#00ADD8",
    Rust: "#dea584",
    TypeScript: "#3178C6",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    C: "#555555",
    PHP: "#4F5D95",
    Ruby: "#701516",
  };
  return colors[lang] || "#888";
};

const features = [
  {
    title: "Run Instantly",
    description: "Write code and run it in seconds.\nNo setup.\nNo installations.",
    snapshot: (
      <div className="w-full max-w-sm h-full flex flex-col bg-[#0a0a0f] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 shadow-lg group-hover:scale-[1.02] transition-transform duration-500">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#050508]/50">
          <WindowControls size="sm" />
          <div className="text-xs text-zinc-500 font-mono">main.py</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]">
            <Play className="w-3 h-3" fill="currentColor" /> Run
          </div>
        </div>
        <div className="p-5 font-mono text-[13px] text-zinc-300">
          <div><span className="text-blue-400">print</span>(<span className="text-green-400">"Hello World!"</span>)</div>
        </div>
        <div className="mt-auto border-t border-zinc-800 bg-black/80 p-4 font-mono text-[11px]">
          <div className="text-zinc-600 mb-2 font-semibold">TERMINAL</div>
          <div className="text-zinc-300 flex items-center gap-2"><span className="text-green-500">➜</span> Hello World!</div>
          <div className="text-zinc-500 mt-2">Execution finished in 12ms</div>
        </div>
      </div>
    )
  },
  {
    title: "Auto Save",
    description: "Every keystroke is safely saved.\nNever lose your work.",
    snapshot: (
      <div className="w-full max-w-sm flex flex-col bg-white dark:bg-[#0a0a0f] rounded-xl border border-zinc-200 dark:border-white/10 shadow-lg p-6 justify-center gap-4 group-hover:scale-[1.02] transition-transform duration-500">
         <div className="flex items-center gap-4 bg-zinc-50 dark:bg-white/5 p-4 rounded-xl border border-zinc-200 dark:border-white/5 shadow-sm">
           <div className="relative flex items-center justify-center">
             <div className="w-3 h-3 rounded-full bg-green-500 absolute animate-ping opacity-50" />
             <div className="w-3 h-3 rounded-full bg-green-500 relative z-10" />
           </div>
           <div className="flex flex-col">
             <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Saved to Cloud</span>
             <span className="text-xs text-zinc-500 mt-0.5">Just now • v1.0.4</span>
           </div>
         </div>
         <div className="flex items-center gap-4 bg-zinc-50/50 dark:bg-white/[0.02] p-4 rounded-xl border border-zinc-200/50 dark:border-white/5 opacity-60">
           <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
           <div className="flex flex-col">
             <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-400">Auto-save</span>
             <span className="text-xs text-zinc-500 mt-0.5">2 mins ago • v1.0.3</span>
           </div>
         </div>
      </div>
    )
  },
  {
    title: "Version History",
    description: "Undo mistakes.\nGo back to any version anytime.",
    snapshot: (
      <div className="w-full max-w-sm h-full flex flex-col bg-white dark:bg-[#0a0a0f] rounded-xl border border-zinc-200 dark:border-white/10 shadow-lg group-hover:scale-[1.02] transition-transform duration-500 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">History</span>
          </div>
          <span className="text-[10px] font-semibold bg-zinc-200 dark:bg-white/10 px-2 py-1 rounded-full text-zinc-600 dark:text-zinc-400">4 versions</span>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-1">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-500/20" />
              <div className="w-px h-10 bg-zinc-200 dark:bg-white/10 my-1.5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">Current <span className="text-[9px] uppercase tracking-wider font-bold bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 px-1.5 py-0.5 rounded">Active</span></div>
              <div className="text-xs text-zinc-500 mt-1">Today, 10:42 AM</div>
            </div>
          </div>
          <div className="flex gap-4 group/item">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 mt-1" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Restored version</div>
              <div className="text-xs text-zinc-500 mt-1">Yesterday, 4:20 PM</div>
            </div>
            <button className="opacity-0 group-hover/item:opacity-100 transition-opacity text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-md h-fit">
              Restore
            </button>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Multi-language Support",
    description: "Switch languages instantly.\nOne editor.\nMany possibilities.",
    snapshot: (
      <div className="w-full h-full flex flex-col justify-center items-center p-6 group-hover:scale-[1.02] transition-transform duration-500">
        <div className="flex flex-wrap justify-center gap-2.5 max-w-[280px]">
          {["Python", "C++", "Java", "JavaScript", "Go", "Rust", "TypeScript", "Swift", "Kotlin", "C", "PHP", "Ruby"].map((lang) => (
            <div key={lang} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f] text-zinc-700 dark:text-zinc-300 shadow-sm flex items-center gap-2 hover:border-zinc-300 dark:hover:border-white/20 transition-colors cursor-default">
              <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getLangColor(lang) }} />
              {lang}
            </div>
          ))}
          <div className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-zinc-300 dark:border-white/20 text-zinc-500 dark:text-zinc-400 flex items-center bg-zinc-50/50 dark:bg-white/[0.02]">
            + More
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Practice Without Setup",
    description: "Focus on solving problems,\nnot configuring your computer.",
    snapshot: (
      <div className="w-full max-w-sm h-full flex bg-[#0a0a0f] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 shadow-lg group-hover:scale-[1.02] transition-transform duration-500">
        {/* Sidebar */}
        <div className="w-14 border-r border-white/5 bg-[#050508] flex flex-col items-center py-4 gap-6 text-zinc-500">
          <FolderTree className="w-5 h-5 text-zinc-300" />
          <Search className="w-5 h-5" />
          <Settings className="w-5 h-5 mt-auto" />
        </div>
        {/* Main */}
        <div className="flex-1 flex flex-col">
          <div className="flex bg-[#050508] border-b border-white/5 pt-2 px-2 gap-1 overflow-hidden">
            <div className="text-xs font-medium bg-white/10 px-4 py-2 rounded-t-lg text-zinc-300 border-t border-x border-white/5">main.cpp</div>
            <div className="text-xs font-medium text-zinc-600 px-4 py-2 rounded-t-lg">utils.h</div>
          </div>
          <div className="flex-1 p-5 font-mono text-[13px] text-zinc-300 bg-[#0a0a0f]">
            <span className="text-blue-400">int</span> main() {'{\n'}
            <span className="text-zinc-500 ml-4">// Start coding</span>
            {'\n}'}
          </div>
          <div className="h-20 border-t border-white/5 bg-black p-3 font-mono text-xs text-zinc-500">
            $ g++ main.cpp<br/>
            $ ./a.out<br/>
            <span className="text-green-500">➜ Ready</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Performance",
    description: "Fast execution inside secure isolated containers.",
    snapshot: (
      <div className="w-full max-w-sm flex flex-col justify-center gap-5 bg-white dark:bg-[#0a0a0f] rounded-xl border border-zinc-200 dark:border-white/10 shadow-lg p-6 group-hover:scale-[1.02] transition-transform duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Linux Container</div>
              <div className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Running • 12ms ping
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono font-semibold text-zinc-500 bg-zinc-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-white/10">
            isolate-8x
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl">
            <div className="text-xs font-medium text-zinc-500 mb-1.5">CPU Usage</div>
            <div className="text-xl font-mono font-bold text-zinc-800 dark:text-zinc-200">0.4%</div>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-xl">
            <div className="text-xs font-medium text-zinc-500 mb-1.5">Memory</div>
            <div className="text-xl font-mono font-bold text-zinc-800 dark:text-zinc-200">12 MB</div>
          </div>
        </div>
      </div>
    )
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white dark:bg-[#050508] relative">
      <Container>
        <SectionTitle
          title="Everything you need to become a better programmer"
          subtitle="Built for students who learn by building real projects."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto mt-20">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-zinc-50/50 dark:bg-[#0a0a0f]/50 border border-zinc-200 dark:border-white/5 rounded-[28px] p-8 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/50 hover:bg-white dark:hover:bg-[#0a0a0f] transition-all duration-300 flex flex-col"
            >
              {/* Aesthetic Snapshot Window */}
              <div className="h-[300px] mb-8 rounded-[20px] bg-zinc-100/50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 flex items-center justify-center p-6 relative overflow-hidden">
                {feature.snapshot}
              </div>
              
              <div className="px-2 mt-auto">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-[15px] leading-relaxed whitespace-pre-line">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
