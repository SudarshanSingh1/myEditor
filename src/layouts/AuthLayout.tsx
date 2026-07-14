import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/ui/Logo";
import { AuthBackground } from "../components/auth/AuthBackground";
import { Code2, Zap, Shield, Globe } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-[#050508] text-foreground font-sans">
      
      {/* Left Side - Branding & Aesthetics */}
      <div className="relative hidden lg:flex h-full lg:w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f]">
        <AuthBackground />
        
        {/* Content above background */}
        <div className="relative z-10 flex flex-col h-full">
          <div>
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <Logo />
            </Link>
          </div>

          <div className="mt-auto mb-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-5xl max-w-md leading-tight">
              Build the future <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500">
                with Hamara Editor.
              </span>
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
              Join thousands of developers building scalable, modern applications with our next-generation cloud editor.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm transition-all hover:border-green-500/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-300">Intelligent Editor</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm transition-all hover:border-blue-500/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-300">Lightning Fast</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm transition-all hover:border-emerald-500/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-300">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-sm transition-all hover:border-orange-500/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Globe className="w-4 h-4" />
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-300">Global CDN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="relative flex w-full lg:w-1/2 h-full overflow-y-auto bg-zinc-50 dark:bg-[#050508]">
        <div className="flex flex-col min-h-full w-full items-center justify-center p-4 sm:p-8 md:p-12">
          {/* Mobile Logo */}
          <div className="absolute top-6 left-6 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          
          {/* Form Container */}
          <div className="w-full max-w-[420px] mx-auto animate-in fade-in zoom-in-95 duration-500 py-12">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
