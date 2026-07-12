import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { SectionTitle } from "../ui/SectionTitle";
import { Card, CardContent } from "../ui/Card";

const testimonials = [
  {
    content: "Hamara Editor completely changed how I learn to code. It's so fast and I never have to worry about losing my work. The UI is just beautiful.",
    author: "Sarah Jenkins",
    role: "Frontend Developer",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    content: "We use it for technical interviews now. It's much cleaner than other online IDEs and the dark mode is perfectly tuned. Highly recommended.",
    author: "David Chen",
    role: "Engineering Manager",
    avatar: "https://i.pravatar.cc/150?u=david"
  },
  {
    content: "The fact that I can start a project on my laptop and continue on my iPad without missing a beat is incredible. A truly modern tool.",
    author: "Elena Rodriguez",
    role: "Full Stack Student",
    avatar: "https://i.pravatar.cc/150?u=elena"
  }
];

export function Testimonials() {
  return (
    <section className="py-20">
      <Container>
        <SectionTitle 
          title="Loved by developers"
          subtitle="Don't just take our word for it. Here is what our community has to say about Hamara Editor."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-secondary/20 border-none hover:bg-secondary/40 transition-colors">
                <CardContent className="pt-6 flex flex-col h-full">
                  <div className="flex text-yellow-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-8 flex-1 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-4 mt-auto">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author}
                      className="h-12 w-12 rounded-full object-cover border-2 border-background shadow-sm"
                      loading="lazy"
                    />
                    <div>
                      <p className="font-semibold text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
