import { Link, Outlet } from "react-router-dom";

import { Logo } from "../components/ui/Logo";

import { AuthBackground } from "../components/auth/AuthBackground";

import { Zap } from "lucide-react";
export function AuthLayout() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden bg-zinc-50 dark:bg-[#050508] text-foreground font-sans">
      
      {/* Left Side - Branding & Aesthetics */}
      <div className="relative flex h-auto lg:h-full w-full lg:w-1/2 flex-col justify-between p-8 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f]">
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

          {/* Feature Image / Dashboard Preview */}
          <div className="relative z-10 flex-1 w-full min-h-[240px] mt-8 mb-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10 opacity-90" />
            <img 
              src="https://images.unsplash.com/photo-1605379399642-870262d3d051?q=80&w=2106&auto=format&fit=crop" 
              alt="Platform capabilities"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
            />
            
            {/* Overlay stats/info */}
            <div className="absolute bottom-6 left-6 z-20 space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 w-fit transition-colors hover:bg-black/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 text-green-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="pr-2">
                  <div className="text-xs text-zinc-400 font-medium">Processing Speed</div>
                  <div className="text-sm font-bold text-white">Lightning Fast</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium tracking-wide">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="relative flex w-full lg:w-1/2 h-full overflow-y-auto bg-zinc-50 dark:bg-[#050508]">
        <div className="flex flex-col min-h-full w-full items-center justify-center p-4 sm:p-8 md:p-12">
          {/* Form Container */}
          <div className="w-full max-w-[420px] mx-auto animate-in fade-in zoom-in-95 duration-500 py-12">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
