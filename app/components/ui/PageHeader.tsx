import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { cn } from "../../lib/utils"

export function PageHeader({ 
  title, 
  description, 
  action, 
  showBack,
  className 
}: { 
  title: string; 
  description?: string; 
  action?: React.ReactNode; 
  showBack?: boolean;
  className?: string; 
}) {
  const navigate = useNavigate()

  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between pb-6", className)}>
      <div className="flex items-start gap-3">
        {showBack && (
          <button 
            onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/app')} 
            className="mt-1 p-1.5 -ml-2 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 mt-2 md:mt-0">{action}</div>}
    </div>
  )
}
