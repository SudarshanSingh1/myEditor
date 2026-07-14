import { useState } from "react";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useUserStore } from "../../stores/useUserStore";
import { useEditorStore } from "../../store/useEditorStore";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { SecuritySettings } from "../../components/settings/SecuritySettings";
import { ConnectedAccounts } from "../../components/settings/ConnectedAccounts";

export default function Settings() {
  const { editor, updateEditorSettings, notifications, updateNotificationSettings } = useSettingsStore();
  const { settings: editorSettings, updateSettings: updateEditorSettingsStore } = useEditorStore();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");

  const isAdmin = user?.role?.toUpperCase() === "ADMIN" || user?.role?.toUpperCase() === "SUPER_ADMIN";

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />

      {/* Admin Portal Banner */}
      {isAdmin && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-semibold text-violet-300">Admin Portal</p>
              <p className="text-sm text-gray-400 mt-0.5">Manage users, analytics, system settings and more.</p>
            </div>
            <Button
              onClick={() => navigate("/app/admin")}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2 flex-shrink-0"
            >
              Open Admin Portal →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-white/10">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "general"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "security"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Security & Access
        </button>
      </div>

      {activeTab === "general" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          {/* Editor Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Editor Preferences</CardTitle>
              <CardDescription>Customize how the code editor behaves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Word Wrap</p>
                  <p className="text-sm text-muted-foreground">Wrap lines that exceed the editor width.</p>
                </div>
                <Button
                  variant={editor.wordWrap ? "default" : "outline"}
                  onClick={() => updateEditorSettings({ wordWrap: !editor.wordWrap })}
                >
                  {editor.wordWrap ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Minimap</p>
                  <p className="text-sm text-muted-foreground">Show a minimap on the right side of the editor.</p>
                </div>
                <Button
                  variant={editor.minimap ? "default" : "outline"}
                  onClick={() => updateEditorSettings({ minimap: !editor.minimap })}
                >
                  {editor.minimap ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Format on Save</p>
                  <p className="text-sm text-muted-foreground">Automatically format code when saving.</p>
                </div>
                <Button
                  variant={editor.formatOnSave ? "default" : "outline"}
                  onClick={() => updateEditorSettings({ formatOnSave: !editor.formatOnSave })}
                >
                  {editor.formatOnSave ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-6 mt-6">
                <div>
                  <p className="font-medium">Auto Save</p>
                  <p className="text-sm text-muted-foreground">Automatically save files after a period of inactivity.</p>
                </div>
                <Button
                  variant={editorSettings.autoSave === 'on' ? "default" : "outline"}
                  onClick={() => updateEditorSettingsStore({ autoSave: editorSettings.autoSave === 'on' ? 'off' : 'on' })}
                >
                  {editorSettings.autoSave === 'on' ? "Enabled" : "Disabled"}
                </Button>
              </div>
              {editorSettings.autoSave === 'on' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Save Delay</p>
                    <p className="text-sm text-muted-foreground">Delay in seconds before triggering auto save.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 3, 5, 10].map((delay) => (
                      <Button
                        key={delay}
                        size="sm"
                        variant={editorSettings.autoSaveDelay === delay ? "default" : "outline"}
                        onClick={() => updateEditorSettingsStore({ autoSaveDelay: delay })}
                      >
                        {delay}s
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between border-t pt-6 mt-6">
                <div>
                  <p className="font-medium">Terminal Prompt</p>
                  <p className="text-sm text-muted-foreground">Customize your bash prompt (e.g. @sudarshan ~$)</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={editorSettings.terminalPrompt || ''}
                    onChange={(e) => updateEditorSettingsStore({ terminalPrompt: e.target.value })}
                    placeholder="@user ~$"
                    className="flex h-9 w-64 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how we contact you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Alerts</p>
                  <p className="text-sm text-muted-foreground">Receive emails about your account activity.</p>
                </div>
                <Button
                  variant={notifications.emailAlerts ? "default" : "outline"}
                  onClick={() => updateNotificationSettings({ emailAlerts: !notifications.emailAlerts })}
                >
                  {notifications.emailAlerts ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Project Invites</p>
                  <p className="text-sm text-muted-foreground">Notify me when I am invited to a project.</p>
                </div>
                <Button
                  variant={notifications.projectInvites ? "default" : "outline"}
                  onClick={() => updateNotificationSettings({ projectInvites: !notifications.projectInvites })}
                >
                  {notifications.projectInvites ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <ConnectedAccounts />
          <SecuritySettings />
        </div>
      )}
    </div>
  );
}
