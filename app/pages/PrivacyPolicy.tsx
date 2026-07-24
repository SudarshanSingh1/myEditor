import { Container } from "../components/layout/Container";
import { LandingNavbar } from "../components/layout/LandingNavbar";
import { LandingFooter } from "../components/layout/LandingFooter";

export default function PrivacyPolicy() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1 py-32">
        <Container className="max-w-3xl prose prose-zinc dark:prose-invert">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-4">Last updated: July 2026</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            At Hamara Editor, we take your privacy seriously. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you visit our website or use our service.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us when registering for an account,
            such as your name, email address, and authentication credentials. We also collect usage
            data and code execution telemetry to improve our services.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
          <p>
            We use the information we collect primarily to provide, maintain, and improve our services,
            as well as to communicate with you regarding updates, security alerts, and support messages.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information and
            source code. However, no method of transmission over the Internet or electronic storage
            is 100% secure.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@hamara.dev.
          </p>
        </Container>
      </main>
      <LandingFooter />
    </div>
  );
}
