import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Code,
  Cloud,
  Terminal,
  GitMerge,
  FilePlus,
  FolderUp,
} from "lucide-react";

import { useUserStore } from "../../stores/useUserStore";
import { useProjectsStore } from "../../stores/useProjectsStore";

import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { ProjectCard } from "../../components/ui/ProjectCard";
import { Button } from "../../components/ui/Button";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { ActivityHeatmap } from "../../components/dashboard/ActivityHeatmap";
import { usersApi } from "../../lib/api/users";
import { workspaceApi } from "../../lib/api/workspace";

export default function Dashboard() {
  const navigate = useNavigate();

  const { user } = useUserStore();

  const {
    projects,
    totalProjects,
    toggleFavorite,
    fetchProjects,
    createProject,
    isLoading,
  } = useProjectsStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Please select a file under 2MB.");
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
    
    // Record activity for the day
    usersApi.recordActivity().catch(console.error);
  }, [fetchProjects]);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 rounded-2xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1 text-zinc-900 dark:text-white">
            Welcome back, {user?.first_name || user?.username}
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Ready to build something amazing today? You have {totalProjects} active projects.
          </p>
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                  <span className="text-xs mt-1 opacity-70">Code files max 2MB</span>
                </button>
              </div>
            )}
          </div>
        </div>
      
      {/* Activity Heatmap Section */}
      <ActivityHeatmap />      
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