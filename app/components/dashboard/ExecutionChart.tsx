import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchApi } from "../../lib/api";
import { TerminalSquare } from "lucide-react";

export function ExecutionChart() {
  const { data: chartResp, isLoading: loading } = useQuery({
    queryKey: ['executions-chart'],
    queryFn: () => fetchApi("/users/activity/executions-chart"),
    refetchInterval: 5000,
  });

  const data = chartResp?.success ? chartResp.data.items || [] : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-4 shadow-2xl">
          <p className="text-gray-400 text-xs mb-3 font-medium tracking-wide uppercase">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-300 text-sm font-medium">{entry.name}</span>
                </div>
                <span className="text-white font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#18181b] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <TerminalSquare className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-wide">Code Executions</h2>
          <p className="text-sm text-zinc-500 dark:text-gray-400">Your success vs error rate over the last 30 days</p>
        </div>
      </div>

      <div className="h-[280px] w-full">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-zinc-200/50 dark:bg-white/5 rounded-xl" />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 dark:text-gray-500">
            No execution data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#888888", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#888888", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#888888', strokeOpacity: 0.2, strokeWidth: 1 }} />
              
              <Area type="monotone" dataKey="total" name="Total Executions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 4, fill: '#fff', stroke: '#3b82f6' }} />
              <Area type="monotone" dataKey="success" name="Successful" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" activeDot={{ r: 4, fill: '#fff', stroke: '#10b981' }} />
              <Area type="monotone" dataKey="error" name="Errors (Mistakes)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorError)" activeDot={{ r: 4, fill: '#fff', stroke: '#ef4444' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
