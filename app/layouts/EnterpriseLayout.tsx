import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useAdminContext } from "../components/auth/AdminAuthGuard";
import { fetchApi } from "../lib/api";
import "../styles/enterprise.css";
import {
  LayoutDashboard, BarChart3, Users, FolderOpen, PlaySquare,
  MessageSquare, Bug, Server, Database, Settings, ShieldCheck,
  ClipboardList, Mail, LogOut, GitBranch, Flag, Bell, TerminalSquare,
  HardDriveUpload, Rocket, AlertOctagon, Search, ChevronLeft,
  ChevronRight, Activity, X, ArrowRight, ExternalLink, Cpu,
  HardDrive, Wifi, Shield, Key, Layers, AlertTriangle, FileText
} from "lucide-react";

/* ─── Navigation Configuration ─────────────────────────────── */
const moderatorNavGroups = [
  {
    label: "Operations",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",    to: "/app/admin",             exact: true },
      { icon: Users,           label: "Users",        to: "/app/admin/users" },
      { icon: FolderOpen,      label: "Projects",     to: "/app/admin/projects" },
    ],
  },
  {
    label: "Moderation",
    items: [
      { icon: Flag,            label: "Reports",      to: "/app/admin/reports" },
      { icon: MessageSquare,   label: "Feedback",     to: "/app/admin/feedback" },
      { icon: Bug,             label: "Errors",       to: "/app/admin/errors" },
      { icon: Bell,            label: "Notifications",to: "/app/admin/notifications" },
    ],
  },
];

const adminNavGroups = [
  {
    label: "Operations",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",    to: "/app/admin",             exact: true },
      { icon: BarChart3,       label: "Analytics",    to: "/app/admin/analytics" },
      { icon: Users,           label: "Users",        to: "/app/admin/users" },
      { icon: FolderOpen,      label: "Projects",     to: "/app/admin/projects" },
      { icon: PlaySquare,      label: "Executions",   to: "/app/admin/executions" },
    ],
  },
  {
    label: "Moderation",
    items: [
      { icon: Flag,            label: "Reports",      to: "/app/admin/reports" },
      { icon: MessageSquare,   label: "Feedback",     to: "/app/admin/feedback" },
      { icon: Bug,             label: "Errors",       to: "/app/admin/errors" },
      { icon: Bell,            label: "Notifications",to: "/app/admin/notifications" },
    ],
  },
];

const ownerNavGroups = [
  {
    label: "Infrastructure",
    items: [
      { icon: Server,          label: "Server",       to: "/super-admin/server",   exact: true },
      { icon: TerminalSquare,  label: "Docker",       to: "/super-admin/docker" },
      { icon: Database,        label: "Database",     to: "/super-admin/database" },
      { icon: HardDriveUpload, label: "Backups",      to: "/super-admin/backups" },
      { icon: Rocket,          label: "Deployments",  to: "/super-admin/deployments" },
    ],
  },
  {
    label: "Platform",
    items: [
      { icon: GitBranch,       label: "GitHub",       to: "/super-admin/github" },
      { icon: Mail,            label: "Emails",       to: "/super-admin/emails" },
      { icon: ClipboardList,   label: "Audit Logs",   to: "/super-admin/audit" },
      { icon: Settings,        label: "Settings",     to: "/super-admin/settings" },
      { icon: AlertOctagon,    label: "Factory Reset",to: "/super-admin/factory-reset" },
    ],
  },
];

/* ─── Command Palette ─────────────────────────────────────── */
const ALL_PAGES = [
  ...adminNavGroups.flatMap(g => g.items),
  ...ownerNavGroups.flatMap(g => g.items),
].map(item => ({ ...item, category: "Pages" }));

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  const results = query.trim()
    ? ALL_PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))
    : ALL_PAGES.slice(0, 8);

  const go = useCallback((to: string) => {
    navigate(to);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) go(results[selected].to);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [results, selected, go, onClose]);

  return (
    <div className="e-cmd-backdrop" onClick={onClose}>
      <div className="e-cmd-palette" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--e-border)" }}>
          <Search size={16} color="var(--e-text-muted)" />
          <input
            className="e-cmd-input"
            style={{ padding: 0, borderBottom: "none", flex: 1 }}
            placeholder="Search pages, actions..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            autoFocus
          />
          <button onClick={onClose} style={{ color: "var(--e-text-faint)", background: "none", border: "none", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div style={{ padding: "20px 16px", color: "var(--e-text-faint)", fontSize: 13, textAlign: "center" }}>
              No results for "{query}"
            </div>
          ) : results.map((r, i) => {
            const Icon = r.icon;
            return (
              <div
                key={r.to}
                className={`e-cmd-result ${i === selected ? "selected" : ""}`}
                onClick={() => go(r.to)}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="e-cmd-result-icon"><Icon size={15} /></div>
                <span style={{ flex: 1 }}>{r.label}</span>
                <ArrowRight size={12} color="var(--e-text-faint)" />
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex", gap: 12, padding: "8px 16px",
          borderTop: "1px solid var(--e-border)",
          fontSize: 10, color: "var(--e-text-faint)",
        }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Live Server Status ─────────────────────────────────── */
function useServerStatus() {
  const [data, setData] = useState<{ cpu: number; status: "online" | "warning" | "offline" }>({ cpu: 0, status: "online" });

  useEffect(() => {
    const poll = async () => {
      try {
        const resp = await fetchApi("/admin/server");
        if (resp?.success) {
          const cpu = resp.data.cpu_percent ?? 0;
          setData({ cpu, status: cpu > 85 ? "warning" : "online" });
        }
      } catch { setData(d => ({ ...d, status: "offline" })); }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  return data;
}

/* ─── EnterpriseLayout ───────────────────────────────────── */
export function EnterpriseLayout({ isSuperAdminLayout = false }: { isSuperAdminLayout?: boolean }) {
  const { user, logout } = useUserStore();
  const { isSuperAdmin, isModerator } = useAdminContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const serverStatus = useServerStatus();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(c => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Role-based nav: Owner → ownerNavGroups | Moderator → moderatorNavGroups | Admin → adminNavGroups
  const navGroups = isSuperAdminLayout
    ? ownerNavGroups
    : isModerator
      ? moderatorNavGroups
      : adminNavGroups;

  const getBreadcrumbs = () => {
    const segs = location.pathname.split("/").filter(Boolean);
    return segs.map(s => s.charAt(0).toUpperCase() + s.slice(1));
  };

  /* ── Nav Item ── */
  const NavItem = ({ icon: Icon, label, to, exact }: { icon: any; label: string; to: string; exact?: boolean }) => (
    <NavLink
      to={to}
      end={exact}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `e-nav-item ${isActive ? "active" : ""}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="e-nav-icon" size={16} strokeWidth={isActive ? 2 : 1.5} />
          <span className="e-nav-label" style={{ opacity: collapsed ? 0 : 1, transition: "opacity 200ms" }}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );

  /* ── Sidebar Component ── */
  const SidebarContent = () => (
    <div className={`e-sidebar ${collapsed ? "collapsed" : "expanded"}`} style={{ height: "100%" }}>
      {/* Logo */}
      <div className="e-sidebar-logo">
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 13,
          boxShadow: "0 0 16px rgba(99,102,241,0.4)",
        }}>H</div>
        <div className="e-sidebar-text" style={{ overflow: "hidden" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--e-text-primary)", whiteSpace: "nowrap" }}>
            Hamara
          </p>
          <p style={{ fontSize: 10, color: "var(--e-text-faint)", whiteSpace: "nowrap" }}>
            {isSuperAdminLayout ? "Owner Console" : "Admin Portal"}
          </p>
        </div>
      </div>

      {/* Nav Groups */}
      <div className="e-nav-scroll">
        {navGroups.map(group => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            <div className="e-nav-group-label">{group.label}</div>
            {group.items.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        ))}

        {/* Cross-portal links */}
        {!isSuperAdminLayout && isSuperAdmin && (
          <div style={{ marginTop: 8 }}>
            <div className="e-nav-group-label">Owner</div>
            <NavItem icon={ShieldCheck} label="Owner Console" to="/super-admin" />
          </div>
        )}
        {isSuperAdminLayout && (
          <div style={{ marginTop: 8 }}>
            <div className="e-nav-group-label">Admin</div>
            <NavItem icon={LayoutDashboard} label="Admin Dashboard" to="/app/admin" />
          </div>
        )}
      </div>

      {/* User Footer */}
      <div style={{ borderTop: "1px solid var(--e-border)", padding: "10px 8px", flexShrink: 0 }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 8px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.username?.slice(0, 2).toUpperCase() || "A"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--e-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.username}
              </p>
              <p style={{ fontSize: 10, color: "var(--e-text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="e-nav-item"
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", justifyContent: collapsed ? "center" : undefined }}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="e-nav-icon" size={15} />
          <span className="e-nav-label">Logout</span>
        </button>
      </div>
    </div>
  );

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="enterprise-layout">
      {/* Command Palette */}
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)", zIndex: 40,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <div style={{ display: "flex", flexShrink: 0 }} className="max-lg:hidden">
        <SidebarContent />
      </div>

      {/* Sidebar — mobile slide-in */}
      {mobileOpen && (
        <div style={{
          position: "fixed", inset: "0 auto 0 0", zIndex: 50,
          display: "flex",
        }}>
          <SidebarContent />
        </div>
      )}

      {/* Main column */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
        {/* Header bar */}
        <header className="e-header">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--e-text-muted)", padding: 4 }}
            className="lg:hidden"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="e-btn e-btn-ghost e-btn-icon max-lg:hidden"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Breadcrumb */}
          <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--e-text-muted)", minWidth: 0 }}>
            {breadcrumbs.map((seg, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ color: "var(--e-border-strong)" }}>/</span>}
                <span style={{ color: i === breadcrumbs.length - 1 ? "var(--e-text-primary)" : undefined, fontWeight: i === breadcrumbs.length - 1 ? 600 : 400 }}>
                  {seg}
                </span>
              </span>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Right: search + status + app link */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Command palette trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="e-btn e-btn-secondary e-btn-sm"
              style={{ gap: 8 }}
              aria-label="Open command palette"
            >
              <Search size={12} />
              <span className="max-sm:hidden" style={{ color: "var(--e-text-muted)" }}>Search</span>
              <kbd style={{
                fontSize: 9, padding: "1px 5px", borderRadius: 4,
                background: "var(--e-bg-elevated)", border: "1px solid var(--e-border)",
                color: "var(--e-text-faint)", fontFamily: "monospace",
              }} className="max-sm:hidden">⌘K</kbd>
            </button>

            {/* Live server status pill */}
            <div className="e-status-pill max-sm:hidden">
              <span className={`e-status-dot ${serverStatus.status}`} />
              <span style={{ color: serverStatus.status === "online" ? "var(--e-green)" : serverStatus.status === "warning" ? "var(--e-amber)" : "var(--e-red)" }}>
                {serverStatus.status === "online" ? "Online" : serverStatus.status === "warning" ? "High Load" : "Offline"}
              </span>
              {serverStatus.cpu > 0 && (
                <span style={{ color: "var(--e-text-faint)" }}>· {serverStatus.cpu.toFixed(0)}%</span>
              )}
            </div>

            {/* Back to app */}
            <a
              href="/app/dashboard"
              className="e-btn e-btn-ghost e-btn-sm max-sm:hidden"
              style={{ gap: 6 }}
            >
              <ExternalLink size={11} />
              App
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="e-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
