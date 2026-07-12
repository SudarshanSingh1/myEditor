import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { fetchApi } from "../../lib/api";

export function AdminErrorsPanel() {
  const [errors, setErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi("/admin/errors");
      if (response.success) {
        setErrors(response.data.items || []);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Loading system errors...</div>;

  return (
    <div className="space-y-4">
      {errors.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground">No system errors logged.</CardContent></Card>
      ) : (
        errors.map((err) => (
          <Card key={err.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive">Error in {err.route || 'Unknown Route'}</CardTitle>
              <CardDescription className="text-xs">
                {new Date(err.created_at).toLocaleString()} • User: {err.user_id || 'Anonymous'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-2 rounded-md overflow-x-auto text-xs whitespace-pre">
                {err.stack_trace}
              </div>
              <p className="text-xs text-muted-foreground mt-2 break-all">
                Browser: {err.browser}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
