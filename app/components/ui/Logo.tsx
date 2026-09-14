import { cn } from "../../lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  imgClassName?: string;
  textClassName?: string;
}

export function Logo({ className, imgClassName, textClassName, ...props }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <img 
        src="/images/hamara-editor-icon.svg" 
        alt="Hamara Editor Logo" 
        fetchPriority="high"
        decoding="async"
        className={cn("h-8 w-8 object-contain", imgClassName)} 
      />
      <span className={cn("font-cursive text-2xl font-bold tracking-tight", textClassName)}>
        Hamara Editor
      </span>
    </div>
  );
}
