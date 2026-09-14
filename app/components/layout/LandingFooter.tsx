import { Link } from "react-router-dom";
import { Container } from "./Container";
import { Logo } from "../ui/Logo";

// GitHub Invertocat mark — official brand logo
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 98 96"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

// LinkedIn "in" box — official brand logo
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={className}
      aria-hidden="true"
    >
      <rect width="72" height="72" rx="8" fill="#0A66C2" />
      <path
        d="M20.103 18.09a4.728 4.728 0 1 1 0 9.457 4.728 4.728 0 0 1 0-9.456zM16.26 31.172h7.686V53.91H16.26V31.172zM30.622 31.172h7.37v3.104h.103c1.026-1.945 3.535-3.993 7.275-3.993 7.784 0 9.222 5.122 9.222 11.786V53.91h-7.67V43.57c0-2.467-.044-5.64-3.44-5.64-3.443 0-3.97 2.69-3.97 5.464V53.91h-7.67V31.172h1.78z"
        fill="#fff"
      />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-background border-t py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Code anywhere. Save automatically. Learn effortlessly. The modern editor for the modern web.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/sudarshan-kushwaha"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md hover:opacity-80 transition-opacity duration-200"
                aria-label="Visit LinkedIn profile"
                title="LinkedIn"
              >
                <LinkedInIcon className="h-9 w-9" />
              </a>
              <a
                href="https://github.com/SudarshanSingh1/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-foreground hover:opacity-70 transition-opacity duration-200"
                aria-label="Visit GitHub profile"
                title="GitHub"
              >
                <GitHubIcon className="h-9 w-9" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#changelog" className="hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-foreground transition-colors">About Us</a></li>
              <li><a href="#contact" className="hover:text-foreground transition-colors">Contact</a></li>
              <li><a href="#careers" className="hover:text-foreground transition-colors">Careers</a></li>
              <li><a href="#blog" className="hover:text-foreground transition-colors">Blog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="group inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.02] transition-all duration-300 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 hover:shadow-[0_0_12px_-4px_rgba(99,102,241,0.2)] text-[13px] sm:text-sm text-zinc-600 dark:text-zinc-400">
            <span className="flex flex-wrap items-center justify-center text-center gap-x-1.5 gap-y-0.5">
              <span className="flex items-center gap-x-1.5">
                Built with 
                <span className="text-red-500 transition-all duration-300 drop-shadow-[0_0_4px_rgba(239,68,68,0.2)] group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] group-hover:scale-110" aria-label="love">❤️</span> 
                by <span className="font-medium text-zinc-900 dark:text-zinc-200">Sudarshan</span>
              </span>
              <span>for his brother — and coders everywhere.</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Hamara Editor. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
