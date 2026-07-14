import { motion } from "framer-motion";
import { FolderPlus, TerminalSquare, Cpu, CloudUpload, Sparkles } from "lucide-react";
import { Container } from "../layout/Container";

const steps = [
  {
    icon: FolderPlus,
    title: "Initialize Workspace",
    description: "Spin up a containerized environment instantly with pre-configured templates for your favorite stack."
  },
  {
    icon: TerminalSquare,
    title: "Write & Execute",
    description: "Code with full IntelliSense, execute directly in the browser terminal, and view live results."
  },
  {
    icon: Cpu,
    title: "Process & Compile",
    description: "Our distributed backend processes your build tasks utilizing high-performance WASM runtimes."
  },
  {
    icon: CloudUpload,
    title: "Continuous Sync",
    description: "Every keystroke is version-controlled and synced to the cloud. Never lose a line of code."
  }
];

export function Workflow() {
  return (
    <section id="workflow" className="py-24 bg-zinc-50 dark:bg-[#050508] relative overflow-hidden border-t border-zinc-200 dark:border-white/5">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <Container className="relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 text-xs font-mono mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SYSTEM_ARCHITECTURE_V2</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white mb-6"
          >
            A workflow designed for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 dark:from-cyan-400 dark:to-purple-500">engineers</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto"
          >
            An end-to-end pipeline built for raw speed and unrestricted creativity. From architecture to deployment in seconds.
          </motion.p>
        </div>
        
        <div className="relative max-w-6xl mx-auto mt-24">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-zinc-200 dark:bg-white/5">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-green-500"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            {/* Glowing orb travelling along the line */}
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_15px_#22d3ee]"
              initial={{ left: "0%", opacity: 0 }}
              whileInView={{ left: "100%", opacity: [0, 1, 1, 0] }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative group pt-12 lg:pt-0"
              >
                {/* Node Connection Point (Desktop) */}
                <div className="hidden lg:flex absolute top-[40px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#0a0a0f] border-2 border-zinc-200 dark:border-white/20 items-center justify-center z-20 group-hover:border-cyan-400 dark:group-hover:border-cyan-400 transition-colors duration-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-cyan-400 transition-colors duration-300" />
                </div>

                {/* Node Box */}
                <div className="h-full bg-white dark:bg-[#0a0a0f] border border-zinc-200 dark:border-white/10 p-6 lg:mt-[80px] rounded-2xl hover:border-cyan-400 dark:hover:border-cyan-500/40 transition-colors duration-500 relative overflow-hidden flex flex-col items-center text-center group-hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                  
                  {/* Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-green-500/0 group-hover:from-cyan-500/5 group-hover:to-purple-500/5 transition-opacity duration-500" />
                  
                  {/* Scanning beam effect */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/50 -translate-y-[100px] group-hover:animate-[scan_2s_ease-in-out_infinite]" />
                  
                  {/* Icon Node */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-cyan-50 dark:bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/40 transition-colors duration-500" />
                    <div className="relative h-14 w-14 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 group-hover:scale-110 group-hover:border-cyan-400 dark:group-hover:border-cyan-500/50 group-hover:text-cyan-600 dark:group-hover:text-white transition-all duration-300 shadow-xl dark:shadow-2xl">
                      <step.icon className="h-6 w-6 text-cyan-600 dark:text-cyan-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="text-[10px] font-mono text-zinc-500 mb-3 uppercase tracking-widest bg-zinc-100 dark:bg-white/5 py-1 px-2 rounded w-fit mx-auto">
                      Node_0{index + 1}
                    </div>
                    <h3 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white">{step.title}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed flex-1">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Vertical connecting line for mobile/tablet */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden w-px h-12 bg-gradient-to-b from-cyan-500/50 to-transparent mx-auto my-4" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
      
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
