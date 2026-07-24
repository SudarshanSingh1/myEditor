import { Container } from "../components/layout/Container";
import { LandingNavbar } from "../components/layout/LandingNavbar";
import { LandingFooter } from "../components/layout/LandingFooter";

export default function TermsOfService() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1 py-32">
        <Container className="max-w-3xl prose prose-zinc dark:prose-invert">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-4">Last updated: July 2026</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Hamara Editor, you agree to be bound by these Terms of Service
            and all applicable laws and regulations. If you do not agree with any of these terms,
            you are prohibited from using or accessing this site.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Use License</h2>
          <p>
            Permission is granted to temporarily use Hamara Editor for personal, non-commercial 
            transitory viewing only. This is the grant of a license, not a transfer of title.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Acceptable Use</h2>
          <p>
            You agree not to use the platform to execute malicious code, mine cryptocurrency, 
            launch denial of service attacks, or engage in any activity that disrupts or interferes 
            with our services.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Limitations</h2>
          <p>
            In no event shall Hamara Editor or its suppliers be liable for any damages (including, 
            without limitation, damages for loss of data or profit, or due to business interruption) 
            arising out of the use or inability to use the materials on Hamara Editor's website.
          </p>
        </Container>
      </main>
      <LandingFooter />
    </div>
  );
}
