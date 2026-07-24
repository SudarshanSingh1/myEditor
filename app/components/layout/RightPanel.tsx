import { X, MessageSquare, Terminal, Zap } from "lucide-react";
import { useSidebarStore } from "../../stores/useSidebarStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

export function RightPanel() {
  const { isRightPanelOpen, setRightPanelOpen } = useSidebarStore();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 mt-16 flex flex-col border-l bg-card transition-all duration-300 md:sticky md:mt-0 md:h-[calc(100vh-4rem)]",
        isRightPanelOpen ? "w-80 translate-x-0" : "w-0 translate-x-full border-l-0"
      )}
    >
      <div className={cn("flex flex-col h-full", !isRightPanelOpen && "hidden")}>
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-medium">Assistant</h3>
          <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Zap className="h-8 w-8" />
          </div>
          <h4 className="font-semibold mb-2">Future Feature</h4>
          <p className="text-sm text-muted-foreground mb-6">
            This panel is reserved for future integrations like AI Chat, Compiler output, and deep Notifications.
          </p>
          
          <div className="w-full space-y-2">
            <Button variant="outline" className="w-full justify-start text-muted-foreground cursor-not-allowed">
              <MessageSquare className="h-4 w-4 mr-2" /> AI Assistant
            </Button>
            <Button variant="outline" className="w-full justify-start text-muted-foreground cursor-not-allowed">
              <Terminal className="h-4 w-4 mr-2" /> Console Output
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
