import * as React from "react"
import { X } from "lucide-react"
import { Button } from "./Button"
import { cn } from "../../lib/utils"

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, footer, className }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-all" 
        onClick={onClose} 
      />
      
      <div 
        className={cn(
          "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg animate-in fade-in-90 zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        
        <div className="py-4">
          {children}
        </div>
        
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
