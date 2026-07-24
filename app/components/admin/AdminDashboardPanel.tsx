import { useState } from "react";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminFeedbackPanel } from "./AdminFeedbackPanel";
import { AdminErrorsPanel } from "./AdminErrorsPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";
import { AdminProjectsPanel } from "./AdminProjectsPanel";
import { AdminAuditPanel } from "./AdminAuditPanel";
import { AdminStatsPanel } from "./AdminStatsPanel";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { useUserStore } from "../../stores/useUserStore";

export function AdminDashboardPanel() {
  const { user } = useUserStore();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN" || user?.role?.toUpperCase() === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState("stats");

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Admin Dashboard</CardTitle>
          <div className="flex gap-4 border-b pb-2 pt-2">
            <button
              onClick={() => setActiveTab("stats")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "stats" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "projects" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "feedback" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Feedback
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "errors" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Errors
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`text-sm font-medium pb-2 -mb-2 border-b-2 transition-colors ${activeTab === "audit" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Audit Logs
            </button>
          </div>
        </CardHeader>
      </Card>

      {activeTab === "stats" && <AdminStatsPanel />}
      {activeTab === "users" && <AdminUsersPanel />}
      {activeTab === "projects" && <AdminProjectsPanel />}
      {activeTab === "settings" && <AdminSettingsPanel />}
      {activeTab === "feedback" && <AdminFeedbackPanel />}
      {activeTab === "errors" && <AdminErrorsPanel />}
      {activeTab === "audit" && <AdminAuditPanel />}
    </div>
  );
}
