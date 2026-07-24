import { LandingNavbar } from "../components/layout/LandingNavbar";
import { LandingFooter } from "../components/layout/LandingFooter";
import { Hero } from "../components/sections/Hero";
import { ActivityShowcase } from "../components/sections/ActivityShowcase";
import { Features } from "../components/sections/Features";
import { FAQ } from "../components/sections/FAQ";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <Hero />
        <Features />
        <ActivityShowcase />
        <FAQ />
      </main>
      <LandingFooter />
    </div>
  );
}
