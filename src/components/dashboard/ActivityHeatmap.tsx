import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../lib/api/users';
import { Flame, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

// Helper to generate the last 365 days
const generateDateRange = () => {
  const dates = [];
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  
  // Adjust to start on a Sunday
  while (oneYearAgo.getDay() !== 0) {
    oneYearAgo.setDate(oneYearAgo.getDate() - 1);
  }

  const currentDate = new Date(oneYearAgo);
  while (currentDate <= today) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export function ActivityHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-heatmap'],
    queryFn: usersApi.getHeatmap
  });

  const dates = useMemo(() => generateDateRange(), []);
  
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.heatmap) {
      data.heatmap.forEach(item => {
        map.set(item.date, item.count);
      });
    }
    return map;
  }, [data]);

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/50';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900/60';
    if (count <= 5) return 'bg-green-400 dark:bg-green-700/80';
    if (count <= 10) return 'bg-green-500 dark:bg-green-500';
    return 'bg-green-600 dark:bg-green-400';
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 shadow-sm animate-pulse h-[250px]">
        <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-6"></div>
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      </div>
    );
  }

  // Group dates into weeks (columns)
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  dates.forEach(date => {
    currentWeek.push(date);
    if (date.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Coding Activity</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{data?.heatmap.reduce((a, b) => a + b.count, 0) || 0} contributions in the last year</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Current Streak</span>
              <span className="text-lg font-bold leading-none text-zinc-900 dark:text-white">{data?.current_streak || 0} days</span>
            </div>
          </div>
          <div className="w-px h-10 bg-zinc-200 dark:bg-white/10"></div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Max Streak</span>
              <span className="text-lg font-bold leading-none text-zinc-900 dark:text-white">{data?.max_streak || 0} days</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((date, dIdx) => {
                const dateString = date.toISOString().split('T')[0];
                const count = activityMap.get(dateString) || 0;
                return (
                  <div
                    key={dIdx}
                    className={cn(
                      "w-3 h-3 rounded-sm transition-colors",
                      getColorClass(count)
                    )}
                    title={`${count} contributions on ${dateString}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
