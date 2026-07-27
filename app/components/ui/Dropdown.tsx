import * as React from "react"
import { cn } from "../../lib/utils"

export function Dropdown({
  trigger,
  children,
  align = "right",
  side = "bottom",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  side?: "top" | "bottom";
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>{trigger}</div>
      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 w-56 rounded-md border shadow-md outline-none animate-in fade-in-80 zoom-in-95",
            "bg-[#151620] border-white/10 text-gray-200",
            align === "right" ? "right-0" : "left-0",
            side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          )}
        >
          <div className="p-1" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <div 
      onClick={onClick}
      className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)}
    >
      {children}
    </div>
  )
}

export function DropdownSeparator() {
  return <div className="-mx-1 my-1 h-px bg-white/10" />;
}
