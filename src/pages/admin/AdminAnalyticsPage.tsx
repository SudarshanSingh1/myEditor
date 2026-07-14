import { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell,
  ComposedChart, Scatter, ScatterChart, ZAxis
} from "recharts";
import { TrendingUp, Users, Activity, BarChart3, Database } from "lucide-react";

const COLORS = ["#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
const PREMIUM_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];

export default function AdminAnalyticsPage() {
  const [timeline, setTimeline] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [statusRatio, setStatusRatio] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: any;
    
    const fetchAll = async () => {
      try {
        const [t, l, s, f] = await Promise.all([
          fetchApi("/admin/analytics/master-timeline"),
          fetchApi("/admin/analytics/languages"),
          fetchApi("/admin/analytics/execution-status"),
          fetchApi("/admin/analytics/feedback-ratings")
        ]);
        if (t?.success) setTimeline(t.data.items || []);
        if (l?.success) setLanguages(l.data.items || []);
        if (s?.success) setStatusRatio(s.data.items || []);
        if (f?.success) setFeedback(f.data.items || []);
      } catch (err: any) {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchAll();
    
    // 5s Polling
    intervalId = setInterval(fetchAll, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-4 shadow-2xl">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-white text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}: <span className="tabular-nums">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      <div className="flex items-center gap-3 border-b border-white/5 pb-6">
        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Center</h1>
          <p className="text-sm text-gray-400 mt-1">Comprehensive system statistics and trends</p>
        </div>
      </div>

      {/* Master Timeline - Full Width */}
      <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
          <Activity className="w-48 h-48 text-white" />
        </div>
        <div className="flex items-center gap-2 mb-6 relative z-10">
          <TrendingUp className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white tracking-wide">Master Timeline (30 Days)</h2>
        </div>
        <div className="h-[400px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeline} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              
              <Area yAxisId="left" type="monotone" name="Registrations" dataKey="users" fillOpacity={1} fill="url(#colorUsers)" stroke="#8b5cf6" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" name="Errors" dataKey="errors" fillOpacity={1} fill="url(#colorErrors)" stroke="#ef4444" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" name="Executions" dataKey="executions" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Executions Trend */}
        <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-pink-400" />
            <h2 className="text-lg font-semibold text-white tracking-wide">Executions (Included in Master)</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="executions" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', strokeWidth: 2 }} activeDot={{ r: 8, fill: '#fff', stroke: '#ec4899' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Status */}
        <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white tracking-wide">Execution Success Ratio</h2>
          </div>
          <div className="h-[300px] w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusRatio}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusRatio.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.status.includes('Success') ? '#10b981' : 
                      entry.status.includes('Compile') ? '#f59e0b' : 
                      entry.status.includes('Runtime') ? '#ef4444' : '#6b7280'
                    } />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, color: "#fff" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Languages Donut */}
        <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white tracking-wide">Language Distribution</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languages}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="language"
                >
                  {languages.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff15", borderRadius: 8, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback Bar */}
        <div className="rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white tracking-wide">Feedback Ratings</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedback} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="rating" tick={{ fill: "#fff", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {feedback.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
