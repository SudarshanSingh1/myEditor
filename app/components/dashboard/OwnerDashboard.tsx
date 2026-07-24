import { MetricCard } from "./MetricCard";
import { SystemHealthWidget } from "./SystemHealthWidget";
import { RecentActivityWidget } from "./RecentActivityWidget";
import { ShieldAlert, Users, Server, HardDrive } from "lucide-react";

export function OwnerDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Users" 
          value="1,245" 
          icon={<Users className="w-4 h-4 text-muted-foreground" />} 
          trend={{ value: 12, isPositive: true }} 
        />
        <MetricCard 
          title="Active Admins" 
          value="8" 
          icon={<ShieldAlert className="w-4 h-4 text-muted-foreground" />} 
        />
        <MetricCard 
          title="Server Load" 
          value="45%" 
          icon={<Server className="w-4 h-4 text-muted-foreground" />} 
          trend={{ value: 5, isPositive: false }} 
        />
        <MetricCard 
          title="Storage Used" 
          value="1.2 TB" 
          icon={<HardDrive className="w-4 h-4 text-muted-foreground" />} 
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <SystemHealthWidget />
        </div>
        <div className="col-span-3">
          <RecentActivityWidget />
        </div>
      </div>
    </div>
  );
}
