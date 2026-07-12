import * as React from "react"
import { cn } from "../../lib/utils"

export function PageHeader({ 
  title, 
  description, 
  action, 
  className 
}: { 
  title: string; 
  description?: string; 
  action?: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
