import { motion } from "framer-motion";
import { Save, Zap } from "lucide-react";
import { Container } from "../layout/Container";
import { SectionTitle } from "../ui/SectionTitle";

const features = [
  {
    title: "Zero Config",
    description: "It just works. No Webpack config to cry over.",
    snapshot: (
      <div className="w-full max-w-[280px] bg-white dark:bg-[#050508] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-xs shadow-2xl">
        <div className="flex gap-1.5 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex gap-2 items-center text-zinc-700 dark:text-zinc-300 mb-2">
          <span className="text-green-500 dark:text-green-400">➜</span>
          <span>npm run start</span>
        </div>
        <p className="text-zinc-400 dark:text-zinc-500 pl-5">Ready in 12ms. You're welcome.</p>
      </div>
    )
  },
  {
    title: "Auto Save",
    description: "Saves faster than you can compulsively hit Ctrl+S.",
    snapshot: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full" />
        <div className="bg-white dark:bg-[#050508] p-6 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col items-center gap-4 group-hover:-translate-y-2 transition-transform duration-500">
          <div className="relative">
            <Save className="w-10 h-10 text-cyan-500 dark:text-cyan-400 group-hover:animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#050508]" />
          </div>
          <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-3 py-1 rounded-full">
            Saved. Again.
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Time Machine",
    description: "Undo that terrible variable name you just wrote.",
    snapshot: (
      <div className="w-full max-w-[280px] bg-white dark:bg-[#050508] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-[11px] shadow-2xl space-y-3">
        <div className="flex items-start gap-3 text-zinc-500 dark:text-zinc-400 bg-red-50 dark:bg-red-500/5 p-2 rounded border border-red-100 dark:border-red-500/10">
          <div className="mt-0.5 text-red-500 font-bold">-</div>
          <span className="line-through text-red-400/80 dark:text-red-400/70">let stuff = "idk man";</span>
        </div>
        <div className="flex items-start gap-3 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/5 p-2 rounded border border-green-200 dark:border-green-500/10">
          <div className="mt-0.5 text-green-500 font-bold">+</div>
          <span>const userPayload = "clean code";</span>
        </div>
      </div>
    )
  },
  {
    title: "Blazing Fast",
    description: "Because nobody has time to watch a spinner.",
    snapshot: (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0,transparent_70%)]" />
        <Zap className="w-32 h-32 text-purple-500/10 absolute group-hover:rotate-12 group-hover:scale-125 transition-all duration-700" />
        <div className="bg-white/80 dark:bg-[#050508]/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500">
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500 dark:from-purple-400 dark:to-cyan-400 tracking-tighter">
            99.9<span className="text-xl text-zinc-400 dark:text-zinc-500">%</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1 text-center">
            Uptime
          </div>
        </div>
      </div>
    )
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-zinc-50 dark:bg-[#050508] border-t border-zinc-200 dark:border-white/5 relative">
      <Container>
        <SectionTitle
          title="Everything you need to code"
          subtitle="No fluff. Just the essentials."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mt-16">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group bg-white dark:bg-[#0a0a0f] border border-zinc-200 dark:border-white/5 rounded-[2rem] p-8 hover:border-zinc-300 dark:hover:border-white/10 transition-colors flex flex-col hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
            >
              {/* Aesthetic Snapshot Window */}
              <div className="h-56 mb-8 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 flex items-center justify-center p-6 relative overflow-hidden">
                {feature.snapshot}
              </div>
              
              <div className="px-2">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
