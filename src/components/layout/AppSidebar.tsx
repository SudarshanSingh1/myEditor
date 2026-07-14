import { NavLink } from "react-router-dom";
import { LayoutDashboard, Folder, LayoutTemplate, Users, Clock, Star, Settings, HelpCircle, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

const SIDEBAR_ITEMS = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/app/projects", icon: Folder },
  { name: "Templates", href: "/app/templates", icon: LayoutTemplate, disabled: true },
  { name: "Shared", href: "/app/shared", icon: Users, disabled: true },
  { name: "Recent", href: "/app/recent", icon: Clock, disabled: true },
  { name: "Favorites", href: "/app/favorites", icon: Star, disabled: true },
  { name: "Trash", href: "/app/trash", icon: Trash2 },
];

const SIDEBAR_BOTTOM_ITEMS = [
  { name: "Settings", href: "/app/settings", icon: Settings },
  { name: "Help", href: "/app/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { isOpen, toggleSidebar, setSidebarOpen } = useSidebarStore();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 mt-16 flex flex-col border-r bg-card transition-all duration-300 md:sticky md:mt-0 md:h-[calc(100vh-4rem)]",
          isOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide flex flex-col">
          <nav className="flex flex-col gap-4 flex-1 justify-evenly">
            {SIDEBAR_ITEMS.map((item) => (
              item.disabled ? (
                <div 
                  key={item.name} 
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed",
                    !isOpen && "justify-center"
                  )}
                  title="Coming Soon"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && <span>{item.name}</span>}
                </div>
              ) : (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    !isOpen && "justify-center"
                  )}
                  onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && <span>{item.name}</span>}
                </NavLink>
              )
            ))}
          </nav>
        </div>

        <div className="border-t p-2">
          <nav className="flex flex-col gap-1 mb-2">
            {SIDEBAR_BOTTOM_ITEMS.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !isOpen && "justify-center"
                )}
                onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
          
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start text-muted-foreground", !isOpen && "justify-center px-0")}
            onClick={toggleSidebar}
          >
            {isOpen ? <PanelLeftClose className="h-5 w-5 mr-2" /> : <PanelLeftOpen className="h-5 w-5" />}
            {isOpen && <span>Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
