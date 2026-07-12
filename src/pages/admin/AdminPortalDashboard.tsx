import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { 
  Users, UserCheck, UserPlus, FolderOpen, 
  Zap, Rocket, MessageSquare, Bug, 
  Activity, Database, Settings, Server, Mail
} from "lucide-react";

interface DashData {
  total_users: number;
  users_today: number;
  active_users: number;
  total_projects: number;
  total_executions: number;
  executions_today: number;
  total_feedback: number;
  total_errors: number;
}

function AnimatedCounter({ value, label, icon: Icon, to, colorClass, glowClass }: {
  value: number; label: string; icon: React.ElementType; to: string; colorClass: string; glowClass: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 40) || 1;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <Link to={to} className="block group">
      <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/5 ${glowClass}`}>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-sm text-gray-400 font-medium tracking-wide uppercase">{label}</p>
            <p className="text-4xl font-bold text-white mt-2 tabular-nums tracking-tight">
              {display.toLocaleString()}
            </p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} bg-opacity-10 text-white shadow-lg`}>
            <Icon className="w-6 h-6" strokeWidth={2} />
          </div>
        </div>
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 bg-gradient-to-br ${colorClass} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
      </div>
    </Link>
  );
}

const quickLinks = [
  { label: "Manage Users", to: "/app/admin/users", icon: Users, desc: "View, edit, suspend users" },
  { label: "Analytics", to: "/app/admin/analytics", icon: Activity, desc: "Charts & trends" },
  { label: "Projects", to: "/app/admin/projects", icon: FolderOpen, desc: "All user projects" },
  { label: "Feedback", to: "/app/admin/feedback", icon: MessageSquare, desc: "User feedback queue" },
  { label: "Emails", to: "/super-admin/emails", icon: Mail, desc: "Email logs & delivery" },
  { label: "System Errors", to: "/app/admin/errors", icon: Bug, desc: "Error logs" },
  { label: "Server Monitor", to: "/super-admin/server", icon: Server, desc: "Live metrics" },
  { label: "Database", to: "/super-admin/database", icon: Database, desc: "DB stats & tables" },
  { label: "System Settings", to: "/super-admin/settings", icon: Settings, desc: "Platform configuration" },
];

export default function AdminPortalDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetchApi("/admin/dashboard");
        if (resp?.success) setData(resp.data);
      } catch (e: any) {
        toast.error(e.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{greeting}, Admin</h1>
          <p className="text-gray-400 mt-2 text-sm">
            {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-400">System Healthy</span>
        </div>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-xl animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-white/10 rounded" />
                  <div className="h-10 w-16 bg-white/10 rounded" />
                </div>
                <div className="h-12 w-12 bg-white/10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedCounter value={data.total_users} label="Total Users" icon={Users} to="/app/admin/users" colorClass="from-violet-500 to-purple-600" glowClass="hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]" />
          <AnimatedCounter value={data.active_users} label="Active Users" icon={UserCheck} to="/app/admin/users" colorClass="from-emerald-500 to-teal-500" glowClass="hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]" />
          <AnimatedCounter value={data.users_today} label="New Today" icon={UserPlus} to="/app/admin/users" colorClass="from-sky-500 to-blue-600" glowClass="hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)]" />
          <AnimatedCounter value={data.total_projects} label="Projects" icon={FolderOpen} to="/app/admin/projects" colorClass="from-amber-500 to-orange-500" glowClass="hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]" />
          <AnimatedCounter value={data.total_executions} label="Executions" icon={Zap} to="/app/admin/executions" colorClass="from-pink-500 to-rose-500" glowClass="hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]" />
          <AnimatedCounter value={data.executions_today} label="Runs Today" icon={Rocket} to="/app/admin/executions" colorClass="from-cyan-500 to-blue-500" glowClass="hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]" />
          <AnimatedCounter value={data.total_feedback} label="Feedback" icon={MessageSquare} to="/app/admin/feedback" colorClass="from-indigo-500 to-violet-500" glowClass="hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]" />
          <AnimatedCounter value={data.total_errors} label="System Errors" icon={Bug} to="/app/admin/errors" colorClass="from-red-500 to-rose-600" glowClass="hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center text-gray-400">
          Failed to load dashboard data.{" "}
          <button onClick={() => window.location.reload()} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Retry Connection</button>
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="pt-4">
        <h2 className="text-xl font-semibold text-white tracking-tight mb-6">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-[#18181b] shadow-lg hover:border-white/20 hover:bg-white/5 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  aria-label={`Go to ${link.label}`}
                >
                  <div className="p-3 rounded-xl bg-white/5 text-gray-400 group-hover:text-violet-400 group-hover:bg-violet-400/10 transition-colors">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white tracking-wide group-hover:text-violet-300 transition-colors">{link.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{link.desc}</p>
                  </div>
                </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
