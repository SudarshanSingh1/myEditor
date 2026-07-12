import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Container } from "../layout/Container";

const advantages = [
  "Zero setup required. Start coding in seconds.",
  "Beginner-friendly interface without overwhelming panels.",
  "Built-in tutorials and contextual help.",
  "Seamless transition from learning to building production apps.",
  "No local environment configuration needed.",
  "Share your code with a simple link."
];

export function WhyHamara() {
  return (
    <section id="about" className="py-20">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Designed for the modern developer journey
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Whether you are just starting your coding journey or you are a seasoned engineer needing a quick sandbox, Hamara Editor adapts to your needs. We removed the complexity of traditional IDEs while keeping the powerful features you rely on.
            </p>
            
            <ul className="space-y-4">
              {advantages.map((adv, index) => (
                <motion.li 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{adv}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/20 border p-8 flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-background shadow-xl border overflow-hidden flex flex-col">
                {/* Mock Editor Header */}
                <div className="h-12 border-b flex items-center px-4 gap-2 bg-muted/50">
                  <div className="h-3 w-3 rounded-full bg-border" />
                  <div className="h-3 w-3 rounded-full bg-border" />
                  <div className="h-3 w-3 rounded-full bg-border" />
                  <div className="ml-4 h-6 w-32 rounded-md bg-background border flex items-center px-2 text-xs text-muted-foreground">
                    index.js
                  </div>
                </div>
                {/* Mock Editor Body */}
                <div className="flex-1 p-6 relative">
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                    <div className="h-4 w-5/6 rounded bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                  </div>
                  
                  {/* Floating helpful tooltip mock */}
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute top-1/2 left-1/4 -translate-y-1/2 rounded-lg bg-foreground text-background p-3 text-sm shadow-xl max-w-[200px]"
                  >
                    <p className="font-medium mb-1">Tip!</p>
                    <p className="text-xs opacity-90">Press Cmd+S to save, or let us handle it automatically.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
