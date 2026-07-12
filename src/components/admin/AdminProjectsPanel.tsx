import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { fetchApi } from "../../lib/api";
import { useConfirm } from "../ui/ConfirmProvider";

interface Project {
  id: string;
  name: string;
  language: string;
  created_at: string;
  owner_username: string;
  file_count: number;
}

export function AdminProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi(`/admin/projects?search=${encodeURIComponent(search)}`);
      if (response.success) {
        setProjects(response.data.items);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to load projects.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    const confirmed = await confirm({
      title: "Delete Project",
      description: "Are you sure you want to delete this project? This will remove all files.",
      confirmText: "Delete",
      variant: "destructive"
    });
    if (!confirmed) return;
    try {
      const response = await fetchApi(`/admin/projects/${projectId}`, {
        method: "DELETE"
      });
      if (response.success) {
        setProjects(projects.filter(p => p.id !== projectId));
        setTotal(total - 1);
        setMessage({ text: "Project deleted successfully", type: "success" });
      }
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to delete project", type: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Management</CardTitle>
        <CardDescription>Manage user workspaces and projects. ({total} total)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message.text && (
          <div className={`p-3 text-sm rounded-md ${message.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
            {message.text}
          </div>
        )}
        
        <div className="flex gap-2">
          <Input 
            placeholder="Search projects..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
            className="max-w-sm"
          />
          <Button onClick={fetchProjects} disabled={isLoading}>Search</Button>
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Files</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map(project => (
                <tr key={project.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{project.name}</td>
                  <td className="px-4 py-3">{project.owner_username}</td>
                  <td className="px-4 py-3">
                    <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                      {project.language}
                    </span>
                  </td>
                  <td className="px-4 py-3">{project.file_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(project.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No projects found.
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
