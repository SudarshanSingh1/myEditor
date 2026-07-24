import { MetricCard } from "./MetricCard";
import { RecentActivityWidget } from "./RecentActivityWidget";
import { Users, FileText, Activity } from "lucide-react";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard 
          title="Total Users" 
          value="1,245" 
          icon={<Users className="w-4 h-4 text-muted-foreground" />} 
          trend={{ value: 12, isPositive: true }} 
        />
        <MetricCard 
          title="Reports Pending" 
          value="24" 
          icon={<FileText className="w-4 h-4 text-muted-foreground" />} 
          trend={{ value: 2, isPositive: false }} 
        />
        <MetricCard 
          title="System Errors" 
          value="3" 
          icon={<Activity className="w-4 h-4 text-muted-foreground" />} 
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-1">
        <RecentActivityWidget />
      </div>
    </div>
  );
}
