import { Outlet } from "react-router-dom";
import { AppNavbar } from "../components/layout/AppNavbar";
import { AppSidebar } from "../components/layout/AppSidebar";
import { RightPanel } from "../components/layout/RightPanel";

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
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
