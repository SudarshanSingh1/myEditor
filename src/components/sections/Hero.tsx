import { motion } from "framer-motion";
import { ArrowRight, Code } from "lucide-react";
import { Button } from "../ui/Button";
import { Container } from "../layout/Container";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[40rem] w-[40rem] rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
              ✨ Introducing Hamara Editor 1.0
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
              <span className="font-cursive block text-primary mb-2 font-normal text-6xl sm:text-7xl lg:text-8xl">
                Hamara Editor
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Code anywhere. Save automatically. Learn effortlessly. The modern, browser-based editor that feels like a native app.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Button size="lg" asChild className="gap-2 h-12 px-8">
                <a href="/signup">Get Started <ArrowRight className="h-4 w-4" /></a>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8">
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </motion.div>

          {/* Animated SVG Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative lg:ml-auto w-full max-w-lg"
          >
            <div className="relative rounded-2xl border bg-card p-2 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 px-2 pt-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="rounded-xl bg-secondary/50 p-4 font-mono text-sm overflow-hidden h-[300px] relative">
                {/* Code typing animation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 1 }}
                  className="text-primary/70"
                >
                  <p><span className="text-blue-500 dark:text-blue-400">function</span> <span className="text-purple-500 dark:text-purple-400">greet</span>() {'{'}</p>
                  <p className="ml-4"><span className="text-blue-500 dark:text-blue-400">const</span> message = <span className="text-green-600 dark:text-green-400">"Welcome to Hamara Editor!"</span>;</p>
                  <p className="ml-4"><span className="text-blue-500 dark:text-blue-400">return</span> message;</p>
                  <p>{'}'}</p>
                  <br/>
                  <p><span className="text-blue-500 dark:text-blue-400">console</span>.log(greet());</p>
                </motion.div>
                
                {/* Cursor blink */}
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="absolute bottom-16 left-4 h-4 w-2 bg-primary"
                />
              </div>
              
              {/* Floating element */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -right-6 -bottom-6 rounded-xl border bg-background p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Auto-saved</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
