import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Settings as SettingsIcon, Shield, Zap, Save, RotateCcw, Mail, Wrench, Globe, Key, Lock, ToggleLeft } from "lucide-react";
import type { Settings } from "./settings/adminSettingsTypes";
import { defaultSettings as defaults } from "./settings/adminSettingsTypes";
import { PageHeader } from "../../components/enterprise/PageHeader";
import { useSystemStore } from "../../stores/useSystemStore";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const checkStatus = useSystemStore(state => state.checkStatus);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetchApi("/admin/system-settings");
        if (resp?.success && resp.data) {
          setSettings({ ...defaults, ...resp.data });
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load settings. Using defaults.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const resp = await fetchApi("/admin/system-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (resp?.success) {
        toast.success("Settings saved successfully");
        await checkStatus();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    setTesting(true);
    setTestStatus("idle");
    try {
      const resp = await fetchApi("/admin/emails/test", {
        method: "POST",
        body: JSON.stringify({ to: settings.smtp_from_email }),
      });
      if (resp?.success) {
        toast.success(resp.message || "Test email sent successfully!");
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send test email");
      setTestStatus("error");
    } finally {
      setTesting(false);
    }
  };

  const reset = () => {
    setSettings(defaults);
    toast.info("Settings reset to defaults. Click Save to apply.");
  };

  const set = (key: keyof Settings) => (val: boolean | number | string) => {
    setSettings(s => ({ ...s, [key]: val }));
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ height: 32, width: 192, background: "var(--e-border)", borderRadius: 8, animation: "e-shimmer 1.5s infinite" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[264, 264].map((h, i) => <div key={i} style={{ borderRadius: 16, border: "1px solid var(--e-border)", background: "var(--e-bg-elevated)", height: h }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--e-bg-base)", minHeight: "100%" }}>
      <PageHeader
        title="System Settings"
        subtitle="Configure global platform behavior, limits, and email delivery"
        icon={SettingsIcon}
        iconColor="var(--e-accent-light)"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} className="e-btn e-btn-secondary" style={{ gap: 6 }}>
              <RotateCcw size={12} /> Reset
            </button>
            <button onClick={save} disabled={saving} className="e-btn e-btn-primary" style={{ gap: 6, opacity: saving ? 0.6 : 1 }}>
              <Save size={12} className={saving ? 'animate-pulse' : ''} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      />
      <div style={{ padding: "20px 24px" }}>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }} className="hidden lg:flex lg:col-span-3">
          {[
            { to: "/super-admin/settings/general",      icon: Globe,       label: "General",             color: "#16a34a" },
            { to: "/super-admin/settings/maintenance",  icon: Wrench,      label: "System Maintenance",   color: "#0891b2" },
            { to: "/super-admin/settings/security",     icon: Shield,      label: "Platform Security",    color: "#7c3aed" },
            { to: "/super-admin/settings/resources",    icon: Zap,         label: "Resource Quotas",      color: "#2563eb" },
            { to: "/super-admin/settings/email",        icon: Mail,        label: "Email & SMTP",          color: "#db2777" },
            { to: "/super-admin/settings/oauth",        icon: Shield,      label: "OAuth Configurations",  color: "#2563eb" },
            { to: "/super-admin/settings/feature-flags",icon: ToggleLeft,  label: "Feature Flags",         color: "#d97706" },
            { to: "/super-admin/settings/api-keys",     icon: Key,         label: "API Keys",              color: "#0891b2" },
            { to: "/super-admin/settings/secrets",      icon: Lock,        label: "Secrets Management",    color: "#dc2626" },
          ].map(({ to, icon: Icon, label, color }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? "_nav-active" : "_nav-idle"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: "none",
                transition: "all 150ms",
                background: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                color: isActive ? "#4f46e5" : "var(--e-text-secondary)",
                border: isActive ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
              })}
            >
              <Icon size={15} style={{ color: color, flexShrink: 0 }} /> {label}
            </NavLink>
          ))}
        </div>

        <div className="lg:col-span-9 space-y-8">
          <Outlet context={{ settings, set, save, saving, testing, testSmtp, testStatus }} />
        </div>
      </div>
      </div>
    </div>
  );
}
