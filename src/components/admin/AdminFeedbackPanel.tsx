import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";

export function AdminFeedbackPanel() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi("/admin/feedback");
      if (response.success) {
        setFeedbacks(response.data.items || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load feedback.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetchApi(`/admin/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      if (response.success) {
        toast.success("Status updated");
        fetchFeedback();
      }
    } catch (error: any) {
      // toast already shown by API
    }
  };

  if (isLoading) return <div>Loading feedback...</div>;

  return (
    <div className="space-y-4">
      {feedbacks.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground">No feedback found.</CardContent></Card>
      ) : (
        feedbacks.map((f) => (
          <Card key={f.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{f.subject}</CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(f.created_at).toLocaleString()} • {f.category} • {f.priority} Priority
                  </CardDescription>
                </div>
                <select 
                  className="text-sm border rounded px-2 py-1"
                  value={f.status}
                  onChange={(e) => updateStatus(f.id, e.target.value)}
                >
                  <option value="New">New</option>
                  <option value="In Review">In Review</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{f.description}</p>
              <p className="text-xs text-muted-foreground mt-2 break-all">
                User: {f.user_id} | Route: {f.current_route}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
