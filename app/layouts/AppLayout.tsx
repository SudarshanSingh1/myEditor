import { Outlet } from "react-router-dom";
import { AppNavbar } from "../components/layout/AppNavbar";
import { AppSidebar } from "../components/layout/AppSidebar";
import { RightPanel } from "../components/layout/RightPanel";
import { useSystemStore } from "../stores/useSystemStore";
import { AlertOctagon } from "lucide-react";

export function AppLayout() {
  const isMaintenanceMode = useSystemStore(state => state.isMaintenanceMode);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {isMaintenanceMode && (
        <div className="bg-red-500/10 border-b border-red-500/20 text-red-500 text-sm py-1.5 px-4 flex items-center justify-center gap-2 shrink-0 z-50">
          <AlertOctagon size={14} />
          <span className="font-medium">Maintenance Mode is ACTIVE.</span>
          <span className="opacity-80">Regular users are being redirected.</span>
        </div>
      )}
      <AppNavbar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <Outlet />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
