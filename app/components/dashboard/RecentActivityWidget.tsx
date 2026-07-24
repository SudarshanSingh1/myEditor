import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { PermissionGate } from "../auth/PermissionGate";
import { fetchApi } from "../../lib/api";

interface AuditLog {
  id: string;
  action: string;
  ip_address: string;
  created_at: string;
}

export function RecentActivityWidget() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetchApi('/admin/audit?limit=5');
        if (res.success) {
          setLogs(res.data.items || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadLogs();
  }, []);

  return (
    <PermissionGate permission="system.storage.view">
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity (Audit)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.ip_address}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
