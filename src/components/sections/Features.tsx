import { motion } from "framer-motion";
import { Cloud, Save, Globe2, History, Zap, MonitorPlay } from "lucide-react";
import { Container } from "../layout/Container";
import { SectionTitle } from "../ui/SectionTitle";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";

const features = [
  {
    title: "Cloud Projects",
    description: "Your workspace is securely synced to the cloud. Access your projects from any device, anywhere in the world.",
    icon: Cloud,
  },
  {
    title: "Auto Save",
    description: "Never lose your progress. Hamara Editor saves every keystroke automatically, so you can focus on writing code.",
    icon: Save,
  },
  {
    title: "Multiple Languages",
    description: "Support for JavaScript, TypeScript, Python, HTML, CSS, and more. A versatile tool for full-stack developers.",
    icon: Globe2,
  },
  {
    title: "Version History",
    description: "Mistakes happen. Instantly rollback to previous versions of your files with our built-in time machine.",
    icon: History,
  },
  {
    title: "Fast Execution",
    description: "Run your code directly in the browser or via our secure cloud containers with near-instant execution.",
    icon: Zap,
  },
  {
    title: "Modern Editor",
    description: "Powered by Monaco Editor, featuring intelligent auto-completion, syntax highlighting, and powerful refactoring.",
    icon: MonitorPlay,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function Features() {
  return (
    <section id="features" className="py-20 bg-secondary/30">
      <Container>
        <SectionTitle
          title="Everything you need to code"
          subtitle="Hamara Editor comes packed with features designed to make you more productive and your code more reliable."
        />
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full border-border/50 bg-background hover:border-primary/20 transition-all duration-300 hover:shadow-md group">
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
