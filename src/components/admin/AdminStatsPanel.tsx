import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { fetchApi } from "../../lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Users, FolderGit2, AlertTriangle, MessageSquare, Database, Activity } from "lucide-react";

interface Stats {
  total_users: number;
  active_users: number;
  admins: number;
  projects: number;
  files: number;
  feedback_count: number;
  errors_today: number;
  storage_used_bytes: number;
}

export function AdminStatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [serverStats, setServerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchServerStats();
    const interval = setInterval(fetchServerStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetchApi(`/admin/statistics`);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServerStats = async () => {
    try {
      const response = await fetchApi(`/admin/server`);
      if (response.success) {
        setServerStats(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch server stats");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Statistics</CardTitle>
          <CardDescription>Loading dashboard data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!stats) return null;

  const serverData = [
    { name: 'CPU Usage', value: serverStats?.cpu_percent || 0, fill: '#3b82f6' },
    { name: 'RAM Usage', value: serverStats?.ram_percent || 0, fill: '#8b5cf6' },
    { name: 'Disk Usage', value: serverStats?.disk_percent || 0, fill: '#10b981' },
  ];

  const userDistribution = [
    { name: 'Active Users', value: stats.active_users },
    { name: 'Admins', value: stats.admins },
    { name: 'Inactive', value: stats.total_users - stats.active_users - stats.admins },
  ];
  const COLORS = ['#10b981', '#8b5cf6', '#94a3b8'];

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="col-span-1 border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users size={20} /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <h3 className="text-2xl font-bold">{stats.total_users}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-purple-100 bg-purple-50/30">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><FolderGit2 size={20} /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Projects</p>
              <h3 className="text-2xl font-bold">{stats.projects}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-indigo-100 bg-indigo-50/30">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><Database size={20} /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Storage</p>
              <h3 className="text-xl font-bold">{formatBytes(stats.storage_used_bytes)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-amber-100 bg-amber-50/30">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full"><MessageSquare size={20} /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Feedback</p>
              <h3 className="text-2xl font-bold">{stats.feedback_count}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-red-100 bg-red-50/30">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Errors Today</p>
              <h3 className="text-2xl font-bold">{stats.errors_today}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-green-100 bg-green-50/30">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full"><Activity size={20} /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">API Status</p>
              <h3 className="text-xl font-bold text-green-600">{serverStats?.api_uptime || "Checking"}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Resources Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Server Resources (Live)</CardTitle>
            <CardDescription>Real-time CPU, RAM and Disk usage</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serverData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {serverData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Demographics</CardTitle>
            <CardDescription>Breakdown of platform users</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
