import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Hero } from "../components/sections/Hero";
import { Features } from "../components/sections/Features";
import { WhyHamara } from "../components/sections/WhyHamara";
import { Workflow } from "../components/sections/Workflow";
import { Testimonials } from "../components/sections/Testimonials";
import { FAQ } from "../components/sections/FAQ";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <WhyHamara />
        <Workflow />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
