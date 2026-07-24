import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { Button } from "../ui/Button";
import { fetchApi } from "../../lib/api";

interface AuditLog {
  id: string;
  action: string;
  username: string;
  ip_address: string | null;
  details: any;
  created_at: string;
}

export function AdminAuditPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi(`/admin/audit`);
      if (response.success) {
        setLogs(response.data.items || []);
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to load audit logs.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Audit Logs</CardTitle>
        <CardDescription>Chronological record of administrative actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message.text && (
          <div className={`p-3 text-sm rounded-md ${message.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
            {message.text}
          </div>
        )}
        
        <div className="flex justify-end">
          <Button onClick={fetchLogs} disabled={isLoading} variant="outline" size="sm">
            Refresh Logs
          </Button>
        </div>

        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.username}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.ip_address || "N/A"}</td>
                  <td className="px-4 py-3 text-xs">
                    <pre className="max-w-xs overflow-x-auto text-muted-foreground bg-muted/30 p-1 rounded">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
