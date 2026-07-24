import { lazy, Suspense } from "react";
import { LandingNavbar } from "../components/layout/LandingNavbar";
import { Hero } from "../components/sections/Hero";

// Lazy load below-the-fold components to reduce initial bundle size
const Features = lazy(() => import("../components/sections/Features").then(m => ({ default: m.Features })));
const ActivityShowcase = lazy(() => import("../components/sections/ActivityShowcase").then(m => ({ default: m.ActivityShowcase })));
const FAQ = lazy(() => import("../components/sections/FAQ").then(m => ({ default: m.FAQ })));
const LandingFooter = lazy(() => import("../components/layout/LandingFooter").then(m => ({ default: m.LandingFooter })));

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <Hero />
        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
          <Features />
          <ActivityShowcase />
          <FAQ />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </div>
  );
}
