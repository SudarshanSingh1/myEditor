import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Settings as SettingsIcon, Shield, Zap, Save, RotateCcw, Mail } from "lucide-react";
import type { Settings } from "./settings/types";
import { defaultSettings as defaults } from "./settings/types";

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
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
            <p className="text-sm text-gray-400 mt-1">Configure global platform behavior, limits, and email.</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-500/20"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2 hidden lg:block">
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
        </div>

        <div className="lg:col-span-9 space-y-8">
          <Outlet context={{ settings, set, save, saving, testing, testSmtp, testStatus }} />
        </div>
      </div>
    </div>
  );
}
