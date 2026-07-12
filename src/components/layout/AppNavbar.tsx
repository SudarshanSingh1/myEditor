import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Bell, Settings, Menu, MessageSquare } from "lucide-react";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { useUserStore } from "../../stores/useUserStore";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";
import { ThemeToggle } from "../ui/ThemeToggle";
import { Avatar } from "../ui/Avatar";
import { SearchInput } from "../ui/SearchInput";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown";
import { FeedbackModal } from "../feedback/FeedbackModal";

export function AppNavbar() {
  const { toggleSidebar, toggleRightPanel } = useSidebarStore();
  const { user, logout } = useUserStore();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <Link to="/app/dashboard" className="hidden md:flex">
          <Logo imgClassName="h-6 w-6" textClassName="text-xl" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 md:px-8 max-w-xl">
        <SearchInput className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={toggleRightPanel}>
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
          <Link to="/app/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
        
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 outline-none">
              <Avatar 
                src={user?.avatar} 
                fallback={user?.first_name?.charAt(0) || user?.username?.charAt(0) || "U"}
                className="h-8 w-8 cursor-pointer ring-2 ring-transparent transition-all hover:ring-primary/20"
              />
            </button>
          }
        >
          <div className="px-2 py-1.5 mb-1 flex flex-col">
            <span className="font-medium text-sm">{user?.first_name || user?.username}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
          <DropdownSeparator />
          <DropdownItem><Link to="/app/profile" className="flex w-full">Profile</Link></DropdownItem>
          <DropdownItem><Link to="/app/settings" className="flex w-full">Settings</Link></DropdownItem>
          <DropdownItem onClick={() => setIsFeedbackOpen(true)} className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Send Feedback</DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={logout} className="text-destructive">Log out</DropdownItem>
        </Dropdown>
      </div>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </header>
  );
}
