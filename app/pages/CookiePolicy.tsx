import { Container } from "../components/layout/Container";
import { LandingNavbar } from "../components/layout/LandingNavbar";
import { LandingFooter } from "../components/layout/LandingFooter";

export default function CookiePolicy() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1 py-32">
        <Container className="max-w-3xl prose prose-zinc dark:prose-invert">
          <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
          <p className="text-muted-foreground mb-4">Last updated: July 2026</p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. What are cookies?</h2>
          <p>
            Cookies are small text files that are placed on your computer or mobile device when you 
            visit a website. They are widely used in order to make websites work, or work more efficiently,
            as well as to provide information to the owners of the site.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">2. How we use cookies</h2>
          <p>
            We use cookies to maintain your session (keeping you logged in), remember your editor 
            preferences (such as theme and font size), and analyze how our service is used so we 
            can improve it.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Types of cookies we use</h2>
          <p>
            <strong>Essential Cookies:</strong> Required for the platform to function properly, including 
            authentication and security.
          </p>
          <p>
            <strong>Preference Cookies:</strong> Used to remember your customized settings and UI choices.
          </p>
        </Container>
      </main>
      <LandingFooter />
    </div>
  );
}
