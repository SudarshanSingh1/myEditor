import { useEffect, useState } from "react";
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
import { GithubRepositories } from "../../components/dashboard/GithubRepositories";

export default function Dashboard() {
  const navigate = useNavigate();

  const { user } = useUserStore();

  const {
    projects,
    totalProjects,
    toggleFavorite,
    fetchProjects,
    isLoading,
  } = useProjectsStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects({
      size: 3,
      sort_by: "last_opened_at",
    });
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

          <Button variant="outline" className="gap-2 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 bg-transparent text-zinc-900 dark:text-white" disabled onClick={() => {}}>
            <FolderUp className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-10">
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
              <div className="grid gap-6 sm:grid-cols-2">
                <LoadingSkeleton className="h-[140px] w-full rounded-xl" />
                <LoadingSkeleton className="h-[140px] w-full rounded-xl" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16 border border-zinc-200 dark:border-white/10 rounded-2xl bg-zinc-50 dark:bg-black/20">
                <Code className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-semibold mb-1 text-zinc-900 dark:text-white">No projects yet</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6">Create your first project to get started.</p>
                <Button className="bg-green-600 hover:bg-green-500 text-white border-0" onClick={() => setIsCreateModalOpen(true)}>Create Project</Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    {...project}
                    onFavorite={toggleFavorite}
                    onOpen={(id) => navigate(`/app/projects/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <GithubRepositories />
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Project Stats */}
          <StatCard
            title="Total Projects"
            value={totalProjects.toString()}
            icon={Code}
            description="Your active workspaces"
          />

          {/* Workspace Usage */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Workspace Usage</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">You have used 120MB of your 5GB storage limit.</p>
            </div>
            <div className="h-2.5 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: '5%' }}></div>
            </div>
          </div>

          {/* Account Role */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 p-6 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Account Role</h3>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{(user?.role || "USER").toUpperCase()}</p>
            </div>
            <Cloud className="h-10 w-10 text-zinc-200 dark:text-white/10" />
          </div>
        </div>
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