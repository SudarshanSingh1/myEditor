import { motion } from "framer-motion";
import { FolderPlus, Keyboard, Play, CloudUpload } from "lucide-react";
import { Container } from "../layout/Container";
import { SectionTitle } from "../ui/SectionTitle";

const steps = [
  {
    icon: FolderPlus,
    title: "Create Project",
    description: "Start from a blank canvas or pick one of our ready-to-use templates for React, Vue, or Vanilla JS."
  },
  {
    icon: Keyboard,
    title: "Write Code",
    description: "Enjoy a rich editing experience with Monaco Editor. Syntax highlighting and IntelliSense included."
  },
  {
    icon: Play,
    title: "Run Instantly",
    description: "Execute your code securely in the browser. See updates in real-time as you type."
  },
  {
    icon: CloudUpload,
    title: "Saved to Cloud",
    description: "Your work is continuously synced. Close your tab and pick up exactly where you left off later."
  }
];

export function Workflow() {
  return (
    <section id="workflow" className="py-20 bg-secondary/30 overflow-hidden">
      <Container>
        <SectionTitle 
          title="A workflow designed for speed"
          subtitle="From idea to execution in seconds, not minutes."
        />
        
        <div className="relative mt-16">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-background border-2 border-primary/20 text-primary shadow-sm group-hover:border-primary group-hover:scale-110 transition-all duration-300">
                  <step.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                  {step.description}
                </p>
                
                {/* Arrow for mobile/tablet */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden mt-8 text-border">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M19 12l-7 7-7-7"/>
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
