import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/ui/Logo";
import { AuthBackground } from "../components/auth/AuthBackground";
import { Code2, Zap, Shield, Globe } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-[#09090b] text-foreground font-sans">
      
      {/* Left Side - Branding & Aesthetics */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-border/40 bg-black">
        <AuthBackground />
        
        {/* Content above background */}
        <div className="relative z-10 flex flex-col h-full">
          <div>
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <Logo />
            </Link>
          </div>

          <div className="mt-auto mb-16 space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl max-w-md leading-tight">
              Build the future <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                with Hamara Editor.
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
              Join thousands of developers building scalable, modern applications with our next-generation cloud editor.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-6 text-sm text-zinc-400">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-purple-400">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="font-medium">Intelligent Editor</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-blue-400">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-medium">Lightning Fast</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-green-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-orange-400">
                <Globe className="w-5 h-5" />
              </div>
              <span className="font-medium">Global CDN</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="relative flex w-full lg:w-1/2 flex-col items-center justify-center p-4 sm:p-8 md:p-12">
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        
        {/* Form Container */}
        <div className="w-full max-w-[420px] mx-auto animate-in fade-in zoom-in-95 duration-500">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
