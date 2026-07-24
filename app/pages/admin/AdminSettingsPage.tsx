import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Settings as SettingsIcon, Shield, Zap, Save, RotateCcw, Mail, Wrench, Globe, Key, Lock, ToggleLeft } from "lucide-react";
import type { Settings } from "./settings/adminSettingsTypes";
import { defaultSettings as defaults } from "./settings/adminSettingsTypes";
import { PageHeader } from "../../components/enterprise/PageHeader";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

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
      if (resp?.success) toast.success("Settings saved successfully");
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
      <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 h-64 animate-pulse" />
          <div className="rounded-2xl border border-white/5 bg-white/5 p-8 h-64 animate-pulse" />
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
        <div className="lg:col-span-3 space-y-2 hidden lg:block">
          <NavLink
            to="/super-admin/settings/general"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Globe className="w-4 h-4 text-emerald-400" /> General
          </NavLink>
          <NavLink
            to="/super-admin/settings/maintenance"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Wrench className="w-4 h-4 text-cyan-400" /> System Maintenance
          </NavLink>
          <NavLink
            to="/super-admin/settings/security"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Shield className="w-4 h-4 text-violet-400" /> Platform Security
          </NavLink>
          <NavLink
            to="/super-admin/settings/resources"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Zap className="w-4 h-4 text-blue-400" /> Resource Quotas
          </NavLink>
          <NavLink
            to="/super-admin/settings/email"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Mail className="w-4 h-4 text-pink-400" /> Email & SMTP
          </NavLink>
          <NavLink
            to="/super-admin/settings/oauth"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Shield className="w-4 h-4 text-blue-500" /> OAuth Configurations
          </NavLink>
          <NavLink
            to="/super-admin/settings/feature-flags"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <ToggleLeft className="w-4 h-4 text-amber-400" /> Feature Flags
          </NavLink>
          <NavLink
            to="/super-admin/settings/api-keys"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Key className="w-4 h-4 text-cyan-400" /> API Keys
          </NavLink>
          <NavLink
            to="/super-admin/settings/secrets"
            className={({ isActive }) =>
              `p-3 rounded-xl font-medium text-sm flex items-center gap-3 transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Lock className="w-4 h-4 text-rose-400" /> Secrets Management
          </NavLink>
        </div>

        <div className="lg:col-span-9 space-y-8">
          <Outlet context={{ settings, set, save, saving, testing, testSmtp, testStatus }} />
        </div>
      </div>
      </div>
    </div>
  );
}
