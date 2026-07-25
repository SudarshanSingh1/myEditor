import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Container } from "../layout/Container";
import { SectionTitle } from "../ui/SectionTitle";
import { cn } from "../../lib/utils";

const faqs = [
  {
    question: "Is Hamara Editor free to use?",
    answer: "Yes, Hamara Editor has a generous free tier that includes unlimited public projects, auto-save functionality, and access to all supported languages. We also offer premium plans for private projects and advanced features."
  },
  {
    question: "Which programming languages are supported?",
    answer: "Hamara Editor supports all programming languages! Whether you're coding in JavaScript, Python, C++, Rust, Go, or any other language, our platform provides a robust environment to write, execute, and share your code instantly."
  },
  {
    question: "Do I need to install anything locally?",
    answer: "No, Hamara Editor runs entirely in your browser. All execution happens securely in our cloud containers or directly via WebAssembly, depending on the language."
  },
  {
    question: "Can I use it offline?",
    answer: "Offline support is currently in development. Right now, you need an active internet connection to compile and run code, as well as sync your projects to the cloud."
  },
  {
    question: "How is it different from VS Code?",
    answer: "While VS Code is a powerful tool for complex software architecture, Hamara Editor is a frictionless cloud playground. It's perfect for quick prototyping, practicing algorithms, and learning without the headache of managing local environments."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 bg-secondary/30">
      <Container className="max-w-3xl">
        <SectionTitle 
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about the product and billing."
        />
        
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "border rounded-xl bg-background overflow-hidden transition-all duration-200",
                  isOpen ? "border-primary/20 shadow-sm" : "hover:border-border/80"
                )}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left font-medium focus:outline-none"
                >
                  <span className="text-foreground">{faq.question}</span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180"
                    )} 
                  />
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
