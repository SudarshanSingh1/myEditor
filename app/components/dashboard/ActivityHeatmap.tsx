import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../lib/api/users';
import { Flame, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MonthBlock {
  monthName: string;
  year: number;
  monthIndex: number;
  weeks: {
    emptyStart: number;
    days: Date[];
  }[];
}

// Helper to generate the last 365 days grouped by month
const generateMonthWiseData = (): MonthBlock[] => {
  const months: MonthBlock[] = [];
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  oneYearAgo.setDate(oneYearAgo.getDate() + 1); // Start exactly 365 days ago
  oneYearAgo.setHours(0, 0, 0, 0);

  const currentDate = new Date(oneYearAgo);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  while (currentDate <= endOfToday) {
    const mName = currentDate.toLocaleString('default', { month: 'short' });
    const y = currentDate.getFullYear();
    const mIdx = currentDate.getMonth();

    let lastMonth = months[months.length - 1];
    if (!lastMonth || lastMonth.monthIndex !== mIdx || lastMonth.year !== y) {
      months.push({ monthName: mName, year: y, monthIndex: mIdx, weeks: [] });
      lastMonth = months[months.length - 1];
    }

    let lastWeek = lastMonth.weeks[lastMonth.weeks.length - 1];
    if (!lastWeek || lastWeek.days.length + lastWeek.emptyStart === 7) {
      lastMonth.weeks.push({
        emptyStart: currentDate.getDay(),
        days: []
      });
      lastWeek = lastMonth.weeks[lastMonth.weeks.length - 1];
    }

    lastWeek.days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return months;
};

const getColorClass = (count: number) => {
  if (count === 0) return 'bg-zinc-200 dark:bg-zinc-800';
  if (count <= 2) return 'bg-green-300 dark:bg-green-900/80';
  if (count <= 5) return 'bg-green-400 dark:bg-green-700';
  if (count <= 10) return 'bg-green-500 dark:bg-green-500';
  return 'bg-green-600 dark:bg-green-400';
};

export function ActivityHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-heatmap'],
    queryFn: usersApi.getHeatmap
  });

  const months = useMemo(() => generateMonthWiseData(), []);
  
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data?.heatmap) {
      data.heatmap.forEach(item => {
        map.set(item.date, item.count);
      });
    }
    return map;
  }, [data]);

  const todayString = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);
  const hasContributedToday = (activityMap.get(todayString) || 0) > 0;

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current && !isLoading) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [isLoading, data]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 shadow-sm animate-pulse h-[250px]">
        <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-6"></div>
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      </div>
    );
  }

  // Dates are now grouped in the `months` variable directly.

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Coding Activity</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{data?.heatmap.reduce((a, b) => a + b.count, 0) || 0} contributions in the last year</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Flame 
              className={cn("w-6 h-6 text-orange-500", hasContributedToday ? "animate-fire" : "")} 
              fill={hasContributedToday ? "currentColor" : "none"}
            />
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

      <div ref={scrollRef} className="flex overflow-x-auto pb-4 scrollbar-hide gap-4 pr-16 md:pr-24">
        {months.map((monthBlock, mIdx) => (
          <div key={mIdx} className="flex flex-col gap-3">
            {/* Grid for this month */}
            <div className="flex gap-1.5">
              {monthBlock.weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {/* padding for empty days at the start of the week */}
                  {Array.from({ length: week.emptyStart }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-3.5 h-3.5 md:w-4 md:h-4 bg-transparent" />
                  ))}
                  
                  {week.days.map((date, dIdx) => {
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const count = activityMap.get(dateString) || 0;
                    const isTopRow = (wIdx === 0 ? week.emptyStart + dIdx : dIdx) < 2;
                    return (
                      <div key={dIdx} className="group relative">
                        <div
                          className={cn(
                            "w-3.5 h-3.5 md:w-4 md:h-4 rounded-[4px] transition-colors cursor-pointer",
                            getColorClass(count)
                          )}
                        />
                        <div className={cn(
                          "absolute left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none",
                          isTopRow ? "top-full mt-2" : "bottom-full mb-2"
                        )}>
                          {isTopRow && <div className="w-2 h-2 -mb-1 rotate-45 bg-zinc-900 dark:bg-white z-0 relative top-[4px]"></div>}
                          <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-nowrap bg-zinc-900 dark:bg-white dark:text-black shadow-lg rounded-md font-medium">
                            {count} contributions on {dateString}
                          </span>
                          {!isTopRow && <div className="w-2 h-2 -mt-1 rotate-45 bg-zinc-900 dark:bg-white z-0 relative bottom-[4px]"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Month label centered under the block */}
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium text-center">
              {monthBlock.monthName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
