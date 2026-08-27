import { lazy, Suspense, useEffect } from "react";

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "../components/ThemeProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Eager loaded
import { AuthGuard } from "../components/auth/AuthGuard";
import { AdminAuthGuard } from "../components/auth/AdminAuthGuard";

// Landing Page (Lazy)
const LandingPage = lazy(() => import("../pages/LandingPage").then(module => ({ default: module.LandingPage })));

// Layouts
const AuthLayout = lazy(() => import("../layouts/AuthLayout").then(module => ({ default: module.AuthLayout })));
const AppLayout = lazy(() => import("../layouts/AppLayout").then(module => ({ default: module.AppLayout })));
const AdminLayout = lazy(() => import("../layouts/EnterpriseLayout").then(module => ({ default: module.EnterpriseLayout })));

// Legal Pages
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("../pages/TermsOfService"));
const CookiePolicy = lazy(() => import("../pages/CookiePolicy"));

// Auth Pages (Lazy)
const Login = lazy(() => import("../pages/auth/Login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("../pages/auth/VerifyEmail"));
const ForceChangePassword = lazy(() => import("../pages/auth/ForceChangePassword"));
const OAuthCallback = lazy(() => import("../pages/auth/OAuthCallback"));

// App Pages (Lazy)
const Dashboard = lazy(() => import("../pages/app/Dashboard"));
const Projects = lazy(() => import("../pages/app/Projects"));
const ProjectOverview = lazy(() => import("../pages/app/ProjectOverview"));
const ProjectWorkspace = lazy(() => import("../pages/app/ProjectWorkspace"));
const Trash = lazy(() => import("../pages/app/Trash"));
const Profile = lazy(() => import("../pages/app/Profile"));
const Settings = lazy(() => import("../pages/app/Settings"));
const Help = lazy(() => import("../pages/app/Help"));
const About = lazy(() => import("../pages/app/About"));

// Admin Pages (Lazy)
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const AdminAnalyticsPage = lazy(() => import("../pages/admin/AdminAnalyticsPage"));
const AdminUsersPage = lazy(() => import("../pages/admin/AdminUsersPage"));
const AdminProjectsPage = lazy(() => import("../pages/admin/AdminProjectsPage"));
const AdminExecutionsPage = lazy(() => import("../pages/admin/AdminExecutionsPage"));
const AdminFeedbackPage = lazy(() => import("../pages/admin/AdminFeedbackPage"));
const AdminErrorsPage = lazy(() => import("../pages/admin/AdminErrorsPage"));
const AdminAuditPage = lazy(() => import("../pages/admin/AdminAuditPage"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage"));
const PlatformSecurity = lazy(() => import("../pages/admin/settings/PlatformSecurity"));
const ResourceQuotas = lazy(() => import("../pages/admin/settings/ResourceQuotas"));
const EmailSmtp = lazy(() => import("../pages/admin/settings/EmailSmtp"));
const SystemMaintenance = lazy(() => import("../pages/admin/settings/SystemMaintenance"));
const GeneralSettings = lazy(() => import("../pages/admin/settings/GeneralSettings"));
const OAuthSettings = lazy(() => import("../pages/admin/settings/OAuthSettings"));
const FeatureFlagsTab = lazy(() => import("../pages/admin/settings/FeatureFlagsTab"));
const ApiKeysTab = lazy(() => import("../pages/admin/settings/ApiKeysTab"));
const SecretsTab = lazy(() => import("../pages/admin/settings/SecretsTab"));
const AdminServerPage = lazy(() => import("../pages/admin/AdminServerPage"));
const AdminDatabasePage = lazy(() => import("../pages/admin/AdminDatabasePage"));
const AdminEmailsPage = lazy(() => import("../pages/admin/AdminEmailsPage"));
const AdminGithubPage = lazy(() => import("../pages/admin/AdminGithubPage"));
const AdminBackupsPage = lazy(() => import("../pages/admin/AdminBackupsPage"));
const AdminDeploymentsPage = lazy(() => import("../pages/admin/AdminDeploymentsPage"));
const AdminFactoryResetPage = lazy(() => import("../pages/admin/AdminFactoryResetPage"));
const AdminReportsPage = lazy(() => import("../pages/admin/AdminReportsPage"));
const AdminDockerPage = lazy(() => import("../pages/admin/AdminDockerPage"));
const AdminNotificationsPage = lazy(() => import("../pages/admin/AdminNotificationsPage"));
const AdminLogsPage = lazy(() => import("../pages/admin/AdminLogsPage"));
const EmailTemplateStudioPage = lazy(() => import("../pages/admin/EmailTemplateStudioPage"));

// Error Pages (Lazy)
const NotFound = lazy(() => import("../pages/error/NotFound"));
const Forbidden = lazy(() => import("../pages/error/Forbidden"));

// Maintenance Page
import { MaintenancePage } from "../pages/MaintenancePage";
import { MaintenanceGuard } from "../components/auth/MaintenanceGuard";
import { SplashLoader } from "../components/ui/SplashLoader";
import { DeploymentManager } from "../components/enterprise/DeploymentManager";

// Fallback loader
const PageLoader = () => <SplashLoader message="Loading workspace..." submessage="Preparing your cloud coding environment" />;

const AdminLoader = () => <SplashLoader variant="admin" message="Securing admin portal..." submessage="Verifying executive credentials" />;

import { useUserStore } from "../stores/useUserStore";
import { authController } from "../services/AuthController";
import { BootstrapManager } from "../components/layout/BootstrapManager";

export default function AppRouter() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DeploymentManager />
        <Suspense fallback={<PageLoader />}>
        <BootstrapManager>
        <MaintenanceGuard>
        <Routes location={location}>
          {/* Public Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Maintenance Route */}
          <Route path="/maintenance" element={<MaintenancePage />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<Login isAdminPortal={true} />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/force-password-change" element={<AuthGuard><ForceChangePassword /></AuthGuard>} />
            <Route path="/oauth/callback/:provider" element={<OAuthCallback />} />
          </Route>

          {/* App Routes */}
          <Route
            path="/app"
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectOverview />} />
            <Route path="projects/:id/editor" element={<ProjectWorkspace />} />
            <Route path="trash" element={<Trash />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
            <Route path="about" element={<About />} />
          </Route>

          {/* Admin Portal — specifically for Admins (Super Admins can also access) */}
          {/* Super Admin and Admins bypass maintenance mode inside the layout */}
          <Route
            path="/app/admin"
            element={
              <AuthGuard>
                <AdminAuthGuard>
                  <Suspense fallback={<AdminLoader />}>
                    <AdminLayout />
                  </Suspense>
                </AdminAuthGuard>
              </AuthGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="projects" element={<AdminProjectsPage />} />
            <Route path="executions" element={<AdminExecutionsPage />} />
            <Route path="feedback" element={<AdminFeedbackPage />} />
            <Route path="errors" element={<AdminErrorsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="notifications" element={<AdminNotificationsPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
          </Route>

          {/* Super Admin Direct Bypass Route */}
          <Route
            path="/super-admin"
            element={
              <AuthGuard>
                <AdminAuthGuard requiredPermission="system.maintenance.toggle">
                  <Suspense fallback={<AdminLoader />}>
                    <AdminLayout isSuperAdminLayout={true} />
                  </Suspense>
                </AdminAuthGuard>
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="/super-admin/server" replace />} />
            <Route path="audit" element={<AdminAuditPage />} />
            <Route path="settings" element={<AdminSettingsPage />}>
              <Route index element={<Navigate to="general" replace />} />
              <Route path="general" element={<GeneralSettings />} />
              <Route path="oauth" element={<OAuthSettings />} />
              <Route path="feature-flags" element={<FeatureFlagsTab />} />
              <Route path="api-keys" element={<ApiKeysTab />} />
              <Route path="secrets" element={<SecretsTab />} />
              <Route path="security" element={<PlatformSecurity />} />
              <Route path="resources" element={<ResourceQuotas />} />
              <Route path="email" element={<EmailSmtp />} />
              <Route path="maintenance" element={<SystemMaintenance />} />
            </Route>
            <Route path="server" element={<AdminServerPage />} />
            <Route path="docker" element={<AdminDockerPage />} />
            <Route path="database" element={<AdminDatabasePage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="backups" element={<AdminBackupsPage />} />
            <Route path="deployments" element={<AdminDeploymentsPage />} />
            <Route path="emails" element={<AdminEmailsPage />} />
            <Route path="email-templates" element={<EmailTemplateStudioPage />} />
            <Route path="github" element={<AdminGithubPage />} />
            <Route path="factory-reset" element={<AdminFactoryResetPage />} />
          </Route>

          {/* Error Routes */}
          <Route path="/403" element={<Forbidden />} />

          {/* Legal Pages */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiePolicy />} />

          {/* 404 Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </MaintenanceGuard>
        </BootstrapManager>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
