import { LandingNavbar } from "../components/layout/LandingNavbar";
import { LandingFooter } from "../components/layout/LandingFooter";
import { Hero } from "../components/sections/Hero";
import { Features } from "../components/sections/Features";
import { WhyHamara } from "../components/sections/WhyHamara";
import { Workflow } from "../components/sections/Workflow";
import { ActivityShowcase } from "../components/sections/ActivityShowcase";
import { FAQ } from "../components/sections/FAQ";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <WhyHamara />
        <Workflow />
        <ActivityShowcase />
        <FAQ />
      </main>
      <LandingFooter />
    </div>
  );
}
