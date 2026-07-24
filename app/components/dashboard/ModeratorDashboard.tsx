import { MetricCard } from "./MetricCard";
import { Users, AlertCircle, FileText } from "lucide-react";

export function ModeratorDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard 
          title="Active Users" 
          value="342" 
          icon={<Users className="w-4 h-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title="Reports to Review" 
          value="24" 
          icon={<AlertCircle className="w-4 h-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title="Content Moderated" 
          value="156" 
          icon={<FileText className="w-4 h-4 text-muted-foreground" />} 
          trend={{ value: 8, isPositive: true }} 
        />
      </div>
      
      <div className="p-8 text-center bg-muted/20 rounded-lg border border-dashed">
        <p className="text-muted-foreground">Select a report from the Reports tab to begin moderation.</p>
      </div>
    </div>
  );
}
