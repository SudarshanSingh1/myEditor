import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useAdminContext } from "../components/auth/AdminAuthGuard";
import { fetchApi } from "../lib/api";
import { 
  LayoutDashboard, BarChart3, Users, FolderOpen, PlaySquare, 
  MessageSquare, Bug, Server, Database, Settings, ShieldCheck, 
  ClipboardList, Mail, LogOut, GitBranch, Flag, Bell, TerminalSquare,
  HardDriveUpload, Rocket, AlertOctagon
} from "lucide-react";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/app/admin", exact: true },
  { icon: BarChart3, label: "Analytics", to: "/app/admin/analytics" },
  { icon: Users, label: "Users", to: "/app/admin/users" },
  { icon: FolderOpen, label: "Projects", to: "/app/admin/projects" },
  { icon: PlaySquare, label: "Executions", to: "/app/admin/executions" },
  { icon: Flag, label: "Reports", to: "/app/admin/reports" },
  { icon: MessageSquare, label: "Feedback", to: "/app/admin/feedback" },
  { icon: Bug, label: "Errors", to: "/app/admin/errors" },
  { icon: Bell, label: "Notifications", to: "/app/admin/notifications" },
];

const superAdminNavItems = [
  { icon: Server, label: "Server", to: "/super-admin/server", exact: true },
  { icon: TerminalSquare, label: "Docker", to: "/super-admin/docker" },
  { icon: Database, label: "Database", to: "/super-admin/database" },
  { icon: HardDriveUpload, label: "Backups", to: "/super-admin/backups" },
  { icon: Rocket, label: "Deployments", to: "/super-admin/deployments" },
  { icon: GitBranch, label: "GitHub", to: "/super-admin/github" },
  { icon: ClipboardList, label: "Audit Logs", to: "/super-admin/audit" },
  { icon: Mail, label: "Emails", to: "/super-admin/emails" },
  { icon: Settings, label: "Settings", to: "/super-admin/settings" },
  { icon: AlertOctagon, label: "Factory Reset", to: "/super-admin/factory-reset" },
];

function ServerStatusDot() {
  const { isModerator } = useAdminContext();
  const [status, setStatus] = useState<"online" | "warning" | "offline">("online");
  const [cpu, setCpu] = useState<number | null>(null);

  useEffect(() => {
    // Moderators do not have permission to hit /admin/server, so don't poll
    if (isModerator) return;
    
    const poll = async () => {
      try {
        const resp = await fetchApi("/admin/server");
        if (resp?.success) {
          const c = resp.data.cpu_percent;
          setCpu(c);
          setStatus(c > 85 ? "warning" : "online");
        }
      } catch (e: any) {
        if (e?.status !== 403) {
          setStatus("offline");
        }
      }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [isModerator]);

  const colors = { online: "#22c55e", warning: "#f59e0b", offline: "#ef4444" };
  const labels = { online: "Online", warning: "High Load", offline: "Offline" };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: colors[status] }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: colors[status] }} />
      </span>
      <span className="text-gray-400">{labels[status]}{typeof cpu === 'number' ? ` · ${cpu.toFixed(0)}%` : ""}</span>
    </div>
  );
}

export function AdminLayout({ isSuperAdminLayout = false }: { isSuperAdminLayout?: boolean }) {
  const { user, logout } = useUserStore();
  const { isSuperAdmin } = useAdminContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItemsToUse = isSuperAdminLayout ? superAdminNavItems : adminNavItems;

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === "/app/admin") return "Dashboard";
    const seg = path.split("/").pop() || "Dashboard";
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  };

  const NavItem = ({ icon: Icon, label, to, exact }: { icon: any; label: string; to: string; exact?: boolean }) => (
    <NavLink
      to={to}
      end={exact}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
          isActive
            ? "bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-inner"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? "text-violet-400" : "text-gray-500 group-hover:text-gray-300"}`} strokeWidth={isActive ? 2 : 1.5} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );

  const Sidebar = () => (
    <aside className="flex flex-col h-full w-60 bg-[#0d0d14] border-r border-white/8">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/8">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">H</div>
        <div>
          <p className="text-sm font-semibold text-white">Hamara Admin</p>
          <p className="text-xs text-gray-500">{isSuperAdminLayout ? "Super Admin Area" : "Admin Dashboard"}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItemsToUse.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        
        {/* If we are in Admin, give a link to switch to Super Admin (if authorized) */}
        {!isSuperAdminLayout && isSuperAdmin && (
          <>
            <div className="pt-3 pb-1 px-3 mt-4 border-t border-white/5">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Super Admin</p>
            </div>
            <NavItem icon={ShieldCheck} label="Super Admin Area" to="/super-admin" />
          </>
        )}
        
        {/* If we are in Super Admin, give a link to switch back to Admin */}
        {isSuperAdminLayout && (
          <>
            <div className="pt-3 pb-1 px-3 mt-4 border-t border-white/5">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Admin</p>
            </div>
            <NavItem icon={LayoutDashboard} label="Admin Dashboard" to="/app/admin" />
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/8 p-3 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.username?.slice(0, 2).toUpperCase() || "A"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors group"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-[#08080f] text-white overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide-in */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top navbar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 h-14 border-b border-white/8 bg-[#0a0a10] flex-shrink-0">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
            <span className="hidden sm:inline text-gray-600">Admin</span>
            <span className="hidden sm:inline text-gray-700">/</span>
            <span className="text-gray-200 font-medium truncate">{getBreadcrumb()}</span>
          </nav>

          <div className="flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ServerStatusDot />
            <a
              href="/app/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
            >
              ← App
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
