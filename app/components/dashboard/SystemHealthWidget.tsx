import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { PermissionGate } from "../auth/PermissionGate";
import { fetchApi } from "../../lib/api";

interface ServerStatus {
  cpu: number;
  mem: {
    total: number;
    available: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
}

export function SystemHealthWidget() {
  const [status, setStatus] = useState<ServerStatus | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetchApi('/admin/server');
        if (res.success) {
          setStatus(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <PermissionGate permission="system.maintenance.toggle">
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU Usage</span>
                  <span>{status.cpu}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${status.cpu}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory Usage</span>
                  <span>{status.mem.percent}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-violet-500" style={{ width: `${status.mem.percent}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground animate-pulse">Loading status...</div>
          )}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
