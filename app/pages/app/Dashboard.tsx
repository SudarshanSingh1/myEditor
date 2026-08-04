import { useEffect, useState, useRef } from "react";

import type { ChangeEvent } from "react";

import { useNavigate } from "react-router-dom";

import { Code, FilePlus, FolderUp } from "lucide-react";
import { useUserStore } from "../../stores/useUserStore";

import { useProjectsStore } from "../../stores/useProjectsStore";

import { PageHeader } from "../../components/ui/PageHeader";

import { ProjectCard } from "../../components/ui/ProjectCard";

import { Button } from "../../components/ui/Button";

import { CreateProjectModal } from "../../components/projects/CreateProjectModal";

import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";

import { ActivityHeatmap } from "../../components/dashboard/ActivityHeatmap";

import { ExecutionChart } from "../../components/dashboard/ExecutionChart";

import { workspaceApi } from "../../lib/api/workspace";

import { fetchApi } from "../../lib/api";

import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const navigate = useNavigate();

  const { user } = useUserStore();

  const {
    projects,
    _totalProjects,
    toggleFavorite,
    fetchProjects,
    createProject,
    isLoading,
  } = useProjectsStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: todaySummaryResp } = useQuery({
    queryKey: ['execution-summary-today'],
    queryFn: () => fetchApi("/users/activity/execution-summary?today=true"),
    refetchInterval: 5000,
  });

  const { data: totalSummaryResp } = useQuery({
    queryKey: ['execution-summary-total'],
    queryFn: () => fetchApi("/users/activity/execution-summary"),
    enabled: todaySummaryResp?.success && todaySummaryResp.data.total === 0,
    refetchInterval: 5000,
  });

  const executionSummary = todaySummaryResp?.success && todaySummaryResp.data.total > 0
    ? todaySummaryResp.data
    : (totalSummaryResp?.success ? totalSummaryResp.data : null);

  const summaryType = todaySummaryResp?.success && todaySummaryResp.data.total > 0 ? "Today" : "Total";

  // Auto-migrate guest project
  useEffect(() => {
    const pendingCodeStr = localStorage.getItem('pendingGuestCode');
    if (pendingCodeStr && !isLoading) {
      try {
        const parsed = JSON.parse(pendingCodeStr);
        localStorage.removeItem('pendingGuestCode');
        
        const extMap: Record<string, string> = {
            'python': 'py',
            'cpp': 'cpp',
            'javascript': 'js',
            'typescript': 'ts',
            'rust': 'rs',
            'go': 'go'
        };
        const ext = extMap[parsed.language] || 'txt';
        
        fetchApi('/workspace/migrate-guest', {
          method: 'POST',
          body: JSON.stringify({
            project_name: "My Guest Project",
            files: [
              {
                name: `main.${ext}`,
                content: parsed.content,
                language: parsed.language,
                extension: ext
              }
            ]
          })
        }).then(res => {
          if (res.success && res.data?.project_id) {
            navigate(`/app/projects/${res.data.project_id}`);
          }
        }).catch(e => console.error("Migration error:", e));
      } catch (e) {
        console.error("Failed to parse guest code", e);
      }
    }
  }, [isLoading, navigate]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict check for coding files
    const validExtensions = /\.(js|ts|jsx|tsx|py|html|css|json|md|cpp|c|go|rs|java|sh|sql)$/i;
    if (!validExtensions.test(file.name)) {
      alert("Invalid file type. Please upload a source code file.");
      e.target.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("File is too large. Please select a file under 4MB.");
      e.target.value = '';
      return;
    }

    e.target.value = '';
    setIsImporting(true);

    try {
      const content = await file.text();
      
      const newProject = await createProject({
        name: file.name,
        description: "Imported from file",
        language: "TypeScript",
        visibility: "PRIVATE",
        color: "blue",
        icon: "💻",
      });

      if (newProject) {
        await workspaceApi.createFile({
          project_id: newProject.id,
          name: file.name,
          content: content,
        });

        navigate(`/app/projects/${newProject.id}/editor`);
      }
    } catch (error) {
      console.error("Failed to import file", error);
      alert("Failed to import file.");
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    fetchProjects({
      size: 3,
      sort_by: "last_opened_at",
    });
  }, [fetchProjects]);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-10 relative">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 rounded-2xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Welcome back, {user?.first_name || user?.username}
          </h2>
          
          {executionSummary && executionSummary.total > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{summaryType === "Today" ? "Today's Activity" : "All-Time Activity"}</span>
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Total Submissions: {executionSummary.total}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Correct: {executionSummary.success} ({executionSummary.success_rate}%)
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Mistakes: {executionSummary.error} ({executionSummary.error_rate}%)
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            className="gap-2 bg-green-600 hover:bg-green-500 text-white border-0 shadow-md transition-all"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <FilePlus className="h-4 w-4" />
            New Project
          </Button>

          <Button variant="outline" className="gap-2 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 bg-transparent text-zinc-900 dark:text-white" disabled={isImporting} onClick={handleImportClick}>
            <FolderUp className="h-4 w-4" />
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".txt,.js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.cpp,.c,.go,.rs,.java,text/*,application/json"
        onChange={handleFileImport} 
      />

      <div className="space-y-10">
        {/* Main Content */}
        <div>
          {/* Recent Projects */}
          <div>
            <PageHeader
              title="Continue Coding"
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate('/app/projects')}>
                  View All
                </Button>
              }
              className="pb-4"
            />

            {isLoading && projects.length === 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <LoadingSkeleton className="h-[140px] w-full rounded-xl" />
                <LoadingSkeleton className="h-[140px] w-full rounded-xl" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16 border border-zinc-200 dark:border-white/10 rounded-2xl bg-zinc-50 dark:bg-black/20">
                <Code className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-semibold mb-1 text-zinc-900 dark:text-white">No projects yet</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6">Create or import your first project to get started.</p>
                <div className="flex justify-center gap-3">
                  <Button className="bg-green-600 hover:bg-green-500 text-white border-0" onClick={() => setIsCreateModalOpen(true)}>Create Project</Button>
                  <Button variant="outline" disabled={isImporting} onClick={handleImportClick}>Import File</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    {...project}
                    onFavorite={toggleFavorite}
                    onOpen={(id) => navigate(`/app/projects/${id}/editor`)}
                  />
                ))}
                
                {/* Import Card */}
                <button
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-2xl bg-zinc-50 dark:bg-black/20 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  <FolderUp className="h-8 w-8 mb-3 opacity-80" />
                  <span className="font-medium text-sm">{isImporting ? 'Importing...' : 'Import File'}</span>
                  <span className="text-xs mt-1 opacity-70">Code files max 4MB</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutionChart />
        {/* Activity Heatmap Section */}
        <ActivityHeatmap />
      </div>      
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(projectId) => {
          setIsCreateModalOpen(false);

          fetchProjects({
            size: 3,
            sort_by: "last_opened_at",
          });

          navigate(`/app/projects/${projectId}`);
        }}
      />
    </div>
  );
}