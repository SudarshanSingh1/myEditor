import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Container } from "../layout/Container";
import { WindowControls } from "../ui/WindowControls";

const codeSnippets = [
  {
    lang: "javascript",
    file: "main.js",
    lines: [
      <div key={1}><span className="text-blue-500 dark:text-blue-400">function</span> <span className="text-purple-500 dark:text-purple-400">greet</span>() {'{'}</div>,
      <div key={2} className="ml-4"><span className="text-blue-500 dark:text-blue-400">const</span> message = <span className="text-green-600 dark:text-green-400">"Welcome to Hamara Editor!"</span>;</div>,
      <div key={3} className="ml-4"><span className="text-blue-500 dark:text-blue-400">return</span> message;</div>,
      <div key={4}>{'}'}</div>,
      <div key={5} className="h-4"></div>,
      <div key={6}><span className="text-blue-500 dark:text-blue-400">console</span>.log(greet());</div>
    ],
    cmd: "node main.js"
  },
  {
    lang: "python",
    file: "main.py",
    lines: [
      <div key={1}><span className="text-blue-500 dark:text-blue-400">def</span> <span className="text-purple-500 dark:text-purple-400">greet</span>():</div>,
      <div key={2} className="ml-4">message = <span className="text-green-600 dark:text-green-400">"Welcome to Hamara Editor!"</span></div>,
      <div key={3} className="ml-4"><span className="text-blue-500 dark:text-blue-400">return</span> message</div>,
      <div key={4} className="h-4"></div>,
      <div key={5}><span className="text-blue-500 dark:text-blue-400">print</span>(greet())</div>
    ],
    cmd: "python main.py"
  },
  {
    lang: "cpp",
    file: "main.cpp",
    lines: [
      <div key={1}><span className="text-blue-500 dark:text-blue-400">#include</span> <span className="text-green-600 dark:text-green-400">&lt;iostream&gt;</span></div>,
      <div key={2} className="h-4"></div>,
      <div key={3}><span className="text-blue-500 dark:text-blue-400">int</span> <span className="text-purple-500 dark:text-purple-400">main</span>() {'{'}</div>,
      <div key={4} className="ml-4">std::cout &lt;&lt; <span className="text-green-600 dark:text-green-400">"Welcome to Hamara Editor!\\n"</span>;</div>,
      <div key={5} className="ml-4"><span className="text-blue-500 dark:text-blue-400">return</span> <span className="text-orange-500">0</span>;</div>,
      <div key={6}>{'}'}</div>
    ],
    cmd: "g++ main.cpp && ./a.out"
  },
  {
    lang: "rust",
    file: "main.rs",
    lines: [
      <div key={1}><span className="text-blue-500 dark:text-blue-400">fn</span> <span className="text-purple-500 dark:text-purple-400">main</span>() {'{'}</div>,
      <div key={2} className="ml-4">println!(<span className="text-green-600 dark:text-green-400">"Welcome to Hamara Editor!"</span>);</div>,
      <div key={3}>{'}'}</div>
    ],
    cmd: "cargo run"
  }
];

const floatingLanguages = [
  { name: "Python", color: "#3572A5", ver: "3.13", style: { top: "15%", left: "5%" } },
  { name: "TypeScript", color: "#3178C6", ver: "5.0", style: { top: "25%", right: "8%" } },
  { name: "JavaScript", color: "#f1e05a", ver: "Node 20", style: { top: "45%", left: "2%" } },
  { name: "C++", color: "#f34b7d", ver: "GCC 12", style: { top: "55%", right: "5%" } },
  { name: "C", color: "#555555", ver: "GCC 12", style: { top: "75%", left: "8%" } },
  { name: "Rust", color: "#dea584", ver: "1.75", style: { top: "85%", right: "12%" } },
  { name: "Go", color: "#00ADD8", ver: "1.21", style: { top: "10%", right: "20%" } },
  { name: "Java", color: "#b07219", ver: "JDK 17", style: { top: "35%", left: "15%" } },
  { name: "HTML/CSS", color: "#e34c26", ver: "HTML5/CSS3", style: { top: "65%", left: "12%" } },
  { name: "SQL", color: "#e38c00", ver: "SQLite/PG", style: { top: "70%", right: "25%" } },
  { name: "Bash", color: "#89e051", ver: "5.2", style: { top: "5%", left: "30%" } },
  { name: "PHP", color: "#4F5D95", ver: "8.2", style: { top: "90%", left: "20%" } },
  { name: "Ruby", color: "#701516", ver: "3.2", style: { top: "40%", right: "18%" } },
  { name: "C#", color: "#178600", ver: ".NET 8", style: { top: "80%", right: "35%" } },
  { name: "Swift", color: "#F05138", ver: "5.9", style: { top: "20%", left: "35%" } },
  { name: "Kotlin", color: "#A97BFF", ver: "1.9", style: { top: "50%", right: "32%" } },
];

export function Hero() {
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [animationStep, setAnimationStep] = useState(0); 

  useEffect(() => {
    let lineTimer: ReturnType<typeof setInterval>;
    let cursorTimer: ReturnType<typeof setTimeout>;
    let clickTimer: ReturnType<typeof setTimeout>;
    let outTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    const currentSnippet = codeSnippets[snippetIndex];

    setVisibleLines(0);
    setAnimationStep(0);

    let currentLine = 0;
    lineTimer = setInterval(() => {
      currentLine++;
      setVisibleLines(currentLine);
      if (currentLine >= currentSnippet.lines.length) {
        clearInterval(lineTimer);
        
        setAnimationStep(1); 
        
        cursorTimer = setTimeout(() => {
          setAnimationStep(2); 
          
          clickTimer = setTimeout(() => {
            setAnimationStep(3); 
            
            outTimer = setTimeout(() => {
              setAnimationStep(4); 
              
              nextTimer = setTimeout(() => {
                setSnippetIndex((prev) => (prev + 1) % codeSnippets.length);
              }, 4000);
            }, 1000);
          }, 300);
        }, 800);
      }
    }, 350); 

    return () => {
      clearInterval(lineTimer);
      clearTimeout(cursorTimer);
      clearTimeout(clickTimer);
      clearTimeout(outTimer);
      clearTimeout(nextTimer);
    };
  }, [snippetIndex]);

  const current = codeSnippets[snippetIndex];

  return (
    <section id="home" className="relative overflow-hidden bg-white dark:bg-[#050508] pt-24 pb-8 lg:pt-32 lg:pb-20 border-b border-zinc-200 dark:border-white/5">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/10 via-background to-transparent dark:from-green-500/15" />
      </div>

      {/* Floating Language Badges (Desktop Only) */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block overflow-hidden z-0">
        {floatingLanguages.map((lang, idx) => (
          <motion.div
            key={lang.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.6, y: [0, -15, 0] }}
            transition={{ 
              opacity: { duration: 1, delay: idx * 0.1 },
              y: { duration: 4 + (idx % 3), repeat: Infinity, ease: "easeInOut", delay: (idx % 2) } 
            }}
            className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 shadow-sm backdrop-blur-sm"
            style={lang.style}
          >
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]" 
              style={{ backgroundColor: lang.color, color: lang.color }}
            />
            <span className="font-semibold">{lang.name}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded">{lang.ver}</span>
          </motion.div>
        ))}
      </div>

      <Container>
        <div className="flex flex-col items-center justify-center relative z-10 w-full">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center max-w-4xl mx-auto"
          >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1]">
                Your personal
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500 animate-gradient">
                  coding playground.
                </span>
              </h1>
              
              <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed mt-6">
                The perfect cloud environment for coders of all levels. 
                Write, test, and execute your logic instantly—no local setup 
                required. Just pure coding.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
                <Link to="/signup">
                  <Button size="lg" className="rounded-full px-8 h-12 text-base font-semibold shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all bg-green-500 hover:bg-green-400 text-white border-0">
                    Start Coding Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base font-semibold border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 bg-transparent text-zinc-900 dark:text-white">
                    Explore Features
                  </Button>
                </a>
              </div>
          </motion.div>

          {/* Interactive Editor / Terminal Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative w-full max-w-4xl mx-auto mt-16 lg:mt-24"
          >
            {/* Animated Mouse Cursor */}
            <motion.div
              className="absolute z-50 pointer-events-none drop-shadow-2xl"
              initial={{ x: 50, y: 200, opacity: 0 }}
              animate={
                animationStep === 0 ? { x: 50, y: 200, opacity: 0 } :
                animationStep === 1 ? { x: "90%", y: 15, opacity: 1 } :
                animationStep === 2 ? { x: "90%", y: 15, opacity: 1, scale: 0.85 } :
                { x: "90%", y: 15, opacity: 0 }
              }
              transition={{ 
                duration: animationStep === 1 ? 0.8 : 0.2, 
                ease: "easeOut" 
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.94c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z" fill="white" stroke="#000" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </motion.div>

            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-200 dark:border-white/10 bg-[#0a0a0f] backdrop-blur-xl h-[450px] flex flex-col mx-auto">
              {/* Fake Window Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050508]/50 flex-shrink-0">
                <WindowControls />
                <div className="text-sm text-zinc-500 font-mono absolute left-1/2 -translate-x-1/2">{current.file}</div>
                
                {/* Run Button */}
                <div 
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    animationStep === 2 
                      ? 'bg-green-500 text-white scale-95 shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}
                >
                  <Play className="w-4 h-4" fill={animationStep === 2 ? "white" : "none"} /> Run
                </div>
              </div>
              
              {/* Editor Pane */}
              <div className="flex-1 px-8 font-mono text-base overflow-hidden text-zinc-300 relative py-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`code-${snippetIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {current.lines.slice(0, visibleLines).map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.1 }}
                      >
                        {line}
                      </motion.div>
                    ))}
                    {/* Editor cursor */}
                    {visibleLines < current.lines.length && (
                      <span className="inline-block w-2.5 h-5 bg-zinc-400 animate-pulse ml-1 align-middle" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Terminal Pane */}
              <div className="h-[160px] flex-shrink-0 bg-black/80 border-t border-zinc-800 p-6 font-mono text-sm overflow-hidden flex flex-col mt-auto">
                <div className="text-zinc-500 mb-3 flex items-center gap-2 uppercase tracking-widest text-[11px] pb-2 border-b border-white/10">
                  TERMINAL
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`term-${snippetIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-zinc-300 mt-2"
                  >
                    {/* Prompt always visible */}
                    <div className="flex items-center gap-2 break-all">
                      <span className="text-purple-400 font-semibold">@sudhanshu</span>
                      <span className="text-cyan-400 font-bold">~$</span>
                      
                      {/* Command typing animation */}
                      {animationStep >= 3 && (
                        <motion.span
                          initial={{ clipPath: "inset(0 100% 0 0)" }}
                          animate={{ clipPath: "inset(0 0% 0 0)" }}
                          transition={{ duration: 0.4, ease: "linear" }}
                          className="inline-block"
                        >
                          {current.cmd}
                        </motion.span>
                      )}

                      {/* Terminal blinking cursor */}
                      {animationStep < 4 && (
                        <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1 align-middle" />
                      )}
                    </div>
                    
                    {/* Output */}
                    {animationStep >= 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-zinc-100 flex items-center gap-2"
                      >
                        <span className="text-green-500">➜</span>
                        Welcome to Hamara Editor!
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
