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
  const [feedbackResolution, setFeedbackResolution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId: any;
    
    const fetchAll = async () => {
      try {
        const [t, l, s, f, fr] = await Promise.all([
          fetchApi("/admin/analytics/master-timeline"),
          fetchApi("/admin/analytics/languages"),
          fetchApi("/admin/analytics/execution-status"),
          fetchApi("/admin/analytics/feedback-ratings"),
          fetchApi("/admin/analytics/feedback-resolution")
        ]);
        if (t?.success) setTimeline(t.data.items || []);
        if (l?.success) setLanguages(l.data.items || []);
        if (s?.success) {
          const formatted = (s.data.items || []).map((item: any) => ({
            ...item,
            status: item.status.replace('ExecutionStatus.', '').replace('_', ' ')
          }));
          setStatusRatio(formatted);
        }
        if (f?.success) setFeedback(f.data.items || []);
        if (fr?.success) {
          const formattedFR = (fr.data.items || []).map((item: any) => ({
            ...item,
            date: item.date.slice(5) // MM-DD format
          }));
          setFeedbackResolution(formattedFR);
        }
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              
              <Area yAxisId="left" type="monotone" name="Registrations" dataKey="users" fillOpacity={1} fill="url(#colorUsers)" stroke="#8b5cf6" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" name="Errors" dataKey="errors" fillOpacity={1} fill="url(#colorErrors)" stroke="#ef4444" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" name="Executions" dataKey="executions" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', strokeWidth: 2 }} activeDot={{ r: 6 }} />
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
                <Line type="monotone" dataKey="executions" stroke="#0ea5e9" strokeWidth={3} dot={{ fill: '#0ea5e9', strokeWidth: 2 }} activeDot={{ r: 8, fill: '#fff', stroke: '#0ea5e9' }} />
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
                      entry.status.toUpperCase().includes('SUCCESS') ? '#10b981' : 
                      entry.status.toUpperCase().includes('COMPILE') ? '#f59e0b' : 
                      entry.status.toUpperCase().includes('RUNTIME') ? '#ef4444' : '#8b5cf6'
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
              <BarChart data={feedback} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="rating" tick={{ fill: "#fff", fontWeight: 600 }} tickLine={false} axisLine={false} 
                  tickFormatter={(val) => {
                    const labels: any = { 1: "1 - Poor", 2: "2 - Fair", 3: "3 - Good", 4: "4 - Very Good", 5: "5 - Excellent" };
                    return labels[val] || val;
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {feedback.map((entry: any, index: number) => {
                    const ratingColors: any = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#84cc16", 5: "#22c55e" };
                    return <Cell key={`cell-${index}`} fill={ratingColors[entry.rating] || "#3b82f6"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback Resolution Timeline */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl border border-white/10 bg-[#18181b] p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white tracking-wide">Feedback Resolution Status</h2>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={feedbackResolution.length > 0 ? feedbackResolution : [
                  { date: '00-00', resolved: 0, open: 0 }
                ]}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6b7280" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="open" stroke="#6b7280" strokeWidth={2} fillOpacity={1} fill="url(#colorOpen)" activeDot={{ r: 6, fill: '#fff', stroke: '#6b7280' }} />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" activeDot={{ r: 8, fill: '#fff', stroke: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
