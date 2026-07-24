import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { fetchApi } from "../../lib/api";

interface SystemSettings {
  id: string;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  login_enabled: boolean;
  read_only_mode: boolean;
}

export function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi("/admin/system-settings");
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to load settings.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const response = await fetchApi("/admin/system-settings", {
        method: "PUT",
        body: JSON.stringify({
          maintenance_mode: settings.maintenance_mode,
          registration_enabled: settings.registration_enabled,
          login_enabled: settings.login_enabled,
          read_only_mode: settings.read_only_mode,
        }),
      });
      if (response.success) {
        setSettings(response.data);
        setMessage({ text: "System settings updated successfully.", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to update settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Loading global system settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription className="text-red-500">Failed to load settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global System Settings</CardTitle>
        <CardDescription>Manage application-wide configurations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message.text && (
          <div className={`p-3 text-sm rounded-md ${message.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
            {message.text}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Maintenance Mode</p>
            <p className="text-sm text-muted-foreground">Disable access to the application for all non-admin users.</p>
          </div>
          <Button 
            variant={settings.maintenance_mode ? "destructive" : "outline"} 
            onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
            disabled={isSaving}
          >
            {settings.maintenance_mode ? "Enabled" : "Disabled"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Allow User Registration</p>
            <p className="text-sm text-muted-foreground">Allow new users to create accounts.</p>
          </div>
          <Button 
            variant={settings.registration_enabled ? "default" : "outline"} 
            onClick={() => setSettings({ ...settings, registration_enabled: !settings.registration_enabled })}
            disabled={isSaving}
          >
            {settings.registration_enabled ? "Enabled" : "Disabled"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Allow User Login</p>
            <p className="text-sm text-muted-foreground">Allow existing users to log in.</p>
          </div>
          <Button 
            variant={settings.login_enabled ? "default" : "outline"} 
            onClick={() => setSettings({ ...settings, login_enabled: !settings.login_enabled })}
            disabled={isSaving}
          >
            {settings.login_enabled ? "Enabled" : "Disabled"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Read-Only Mode</p>
            <p className="text-sm text-muted-foreground">Prevent any modifications to files or projects.</p>
          </div>
          <Button 
            variant={settings.read_only_mode ? "destructive" : "outline"} 
            onClick={() => setSettings({ ...settings, read_only_mode: !settings.read_only_mode })}
            disabled={isSaving}
          >
            {settings.read_only_mode ? "Enabled" : "Disabled"}
          </Button>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save System Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
