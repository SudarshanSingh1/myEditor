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

export function Hero() {
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [animationStep, setAnimationStep] = useState(0); 
  // 0: typing code, 1: cursor moving, 2: cursor clicking, 3: typing cmd, 4: output

  useEffect(() => {
    let lineTimer: ReturnType<typeof setInterval>;
    let cursorTimer: ReturnType<typeof setTimeout>;
    let clickTimer: ReturnType<typeof setTimeout>;
    let outTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    const currentSnippet = codeSnippets[snippetIndex];

    // Reset states
    setVisibleLines(0);
    setAnimationStep(0);

    // Animate lines
    let currentLine = 0;
    lineTimer = setInterval(() => {
      currentLine++;
      setVisibleLines(currentLine);
      if (currentLine >= currentSnippet.lines.length) {
        clearInterval(lineTimer);
        
        // Start run button sequence
        setAnimationStep(1); // Moving cursor
        
        cursorTimer = setTimeout(() => {
          setAnimationStep(2); // Clicking button
          
          clickTimer = setTimeout(() => {
            setAnimationStep(3); // Typing command in terminal
            
            outTimer = setTimeout(() => {
              setAnimationStep(4); // Display output
              
              nextTimer = setTimeout(() => {
                setSnippetIndex((prev) => (prev + 1) % codeSnippets.length);
              }, 4000);
            }, 1000);
          }, 300);
        }, 800);
      }
    }, 350); // Typing speed

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
    <section id="home" className="relative overflow-hidden bg-white dark:bg-[#050508] pt-32 pb-12 lg:pt-48 lg:pb-16 flex items-center border-b border-zinc-200 dark:border-white/5">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/10 via-background to-transparent dark:from-green-500/20" />
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start text-left"
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

              <div className="flex flex-col sm:flex-row items-center justify-start gap-4 pt-8 relative z-50">
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
            className="relative lg:ml-auto w-full max-w-lg"
          >
            {/* Animated Mouse Cursor */}
            <motion.div
              className="absolute z-50 pointer-events-none drop-shadow-2xl"
              initial={{ x: 50, y: 200, opacity: 0 }}
              animate={
                animationStep === 0 ? { x: 50, y: 200, opacity: 0 } :
                animationStep === 1 ? { x: 420, y: 15, opacity: 1 } :
                animationStep === 2 ? { x: 420, y: 15, opacity: 1, scale: 0.85 } :
                { x: 420, y: 15, opacity: 0 }
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

            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-white/10 bg-[#0a0a0f] backdrop-blur-xl h-[380px] flex flex-col">
              {/* Fake Window Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#050508]/50 flex-shrink-0">
                <WindowControls />
                <div className="text-xs text-zinc-500 font-mono absolute left-1/2 -translate-x-1/2">{current.file}</div>
                
                {/* Run Button */}
                <div 
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                    animationStep === 2 
                      ? 'bg-green-500 text-white scale-95 shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}
                >
                  <Play className="w-3 h-3" fill={animationStep === 2 ? "white" : "none"} /> Run
                </div>
              </div>
              
              {/* Editor Pane */}
              <div className="flex-1 px-4 font-mono text-sm overflow-hidden text-zinc-300 relative py-4">
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
                      <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1 align-middle" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Terminal Pane */}
              <div className="h-[140px] flex-shrink-0 bg-black/80 border-t border-zinc-800 p-4 font-mono text-xs overflow-hidden flex flex-col mt-auto">
                <div className="text-zinc-500 mb-2 flex items-center gap-2 uppercase tracking-widest text-[10px] pb-2 border-b border-white/10">
                  TERMINAL
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`term-${snippetIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-zinc-300 mt-1"
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
                        <span className="inline-block w-1.5 h-3 bg-zinc-400 animate-pulse ml-1 align-middle" />
                      )}
                    </div>
                    
                    {/* Output */}
                    {animationStep >= 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-zinc-100 flex items-center gap-2"
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
