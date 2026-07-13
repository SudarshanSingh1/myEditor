import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { GitBranch, FolderGit2, Star, GitFork, Loader2, CheckCircle2 } from "lucide-react";
import { githubApi, gitApi } from "../../lib/api/github";
import { projectsApi } from "../../lib/api/projects";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function GithubRepositories() {
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingRepoId, setImportingRepoId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await githubApi.getRepos();
      setRepos(res.data);
    } catch (err: any) {
      if (err.status === 401 || err.message?.toLowerCase().includes("not connected") || err.message?.toLowerCase().includes("missing access token")) {
        setError("github_not_connected");
      } else {
        setError(err.message || "Failed to load repositories");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (repo: any) => {
    try {
      setImportingRepoId(repo.id);
      toast.info(`Importing ${repo.name}...`);
      
      // 1. Create the project
      const projectRes = await projectsApi.createProject({
        name: repo.name,
        description: repo.description || "Imported from GitHub",
        visibility: repo.private ? "PRIVATE" : "PUBLIC",
        language: repo.language || "text"
      });
      
      const projectId = projectRes.data.id;
      
      // 2. Clone the repo
      await gitApi.clone({
        project_id: projectId,
        repo_url: repo.clone_url
      });
      toast.success("Repository imported successfully!");
      navigate(`/app/projects/${projectId}/editor`);
      
    } catch (err: any) {
      toast.error(err.message || "Failed to import repository");
      setImportingRepoId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            GitHub Repositories
          </CardTitle>
          <CardDescription>Loading your repositories...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error === "github_not_connected") {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <GitBranch className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect GitHub</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Link your GitHub account in Settings to view and import your repositories directly from the dashboard.
          </p>
          <Button variant="outline" onClick={() => navigate('/app/settings?tab=security')}>
            Go to Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchRepos}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Your Repositories
        </CardTitle>
        <CardDescription>Recently updated repositories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repos.slice(0, 5).map((repo) => (
            <div key={repo.id} className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex gap-3">
                <FolderGit2 className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium hover:underline cursor-pointer">
                    <a href={repo.html_url} target="_blank" rel="noreferrer">
                      {repo.full_name}
                    </a>
                  </h4>
                  {repo.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      {repo.language || "Unknown"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" />
                      {repo.forks_count}
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => handleImport(repo)}
                disabled={importingRepoId === repo.id}
              >
                {importingRepoId === repo.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          ))}
          {repos.length > 5 && (
            <Button variant="ghost" className="w-full text-muted-foreground">
              View all {repos.length} repositories
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
